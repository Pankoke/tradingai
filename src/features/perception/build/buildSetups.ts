import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import { computeSetupConfidence, computeSetupScore } from "@/src/lib/engine/scoring";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";
import type { Setup } from "@/src/lib/engine/types";
import type {
  PerceptionSnapshotItemInput,
  PerceptionSnapshotInput,
  PerceptionSnapshotWithItems,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import { getSnapshotByTime } from "@/src/server/repositories/perceptionSnapshotRepository";
import { saveSnapshotToStore } from "@/src/features/perception/cache/snapshotStore";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { computeRingsForSetup } from "@/src/lib/engine/rings";
import {
  getPerceptionDataMode,
  type PerceptionDataMode,
} from "@/src/lib/config/perceptionDataMode";
import { buildRingAiSummaryForSetup } from "@/src/lib/engine/modules/ringAiSummary";
import { maybeEnhanceRingAiSummaryWithLLM } from "@/src/server/ai/ringSummaryOpenAi";
import { computeSentimentRankingAdjustment } from "@/src/lib/engine/sentimentAdjustments";
import { clamp } from "@/src/lib/math";
import type { SetupProfile } from "@/src/lib/config/setupProfile";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";
import { resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";
import { deriveSetupProfileFromTimeframe } from "@/src/lib/config/setupProfile";
import type { SetupGrade } from "@/src/lib/engine/types";

export type PerceptionSnapshotEngineResult = PerceptionSnapshot;

type BuildParams = {
  snapshotTime?: Date;
  mode?: PerceptionDataMode;
  source?: SnapshotBuildSource;
  allowSync?: boolean;
  profiles?: SetupProfile[];
  label?: string;
  assetFilter?: string[];
  snapshotId?: string;
};

const SNAPSHOT_VERSION = process.env.SETUP_ENGINE_VERSION ?? "v1.0.0";
const MAX_LLM_SUMMARIES_PER_SNAPSHOT = 5;

function deriveSnapshotLabel(date: Date): "morning" | "us_open" | "eod" | null {
  const hour = date.getUTCHours();
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "us_open";
  if (hour >= 16) return "eod";
  return null;
}

function normalizeDirection(direction: Setup["direction"]): "long" | "short" | "neutral" {
  const normalized = direction.toLowerCase();
  if (normalized === "long") return "long";
  if (normalized === "short") return "short";
  return "neutral";
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export type SnapshotBuildSource = "ui" | "admin" | "cron" | "cron_intraday";

export function derivePersistedDecision(setup: Setup, evaluation: { setupType?: string | null }): string {
  const fromSetup = (setup as { setupDecision?: string | null }).setupDecision;
  if (fromSetup && typeof fromSetup === "string") return fromSetup.toUpperCase();
  const setupType = evaluation.setupType ?? (setup as { setupType?: string | null }).setupType;
  if (setupType && typeof setupType === "string") return setupType.toUpperCase();
  if ((setup as { noTradeReason?: string | null }).noTradeReason) return "NO_TRADE";
  return "UNKNOWN";
}

export async function buildAndStorePerceptionSnapshot(
  params: BuildParams = {},
): Promise<PerceptionSnapshotWithItems> {
  const snapshotTime = params.snapshotTime ?? new Date();
  const mode: PerceptionDataMode = params.mode ?? getPerceptionDataMode();

  const start = Date.now();
  const engineResult: PerceptionSnapshotEngineResult = await buildPerceptionSnapshot({
    asOf: snapshotTime,
    allowSync: params.allowSync,
    profiles: params.profiles,
    assetFilter: params.assetFilter,
  });
  const generatedMs = Date.now() - start;

  const snapshotId = params.snapshotId ?? createId("snapshot");

  // Limit LLM usage to top-N setups per snapshot; always include setup of the day.
  const llmTargetIds = new Set<string>(
    engineResult.setups
      .slice(0, MAX_LLM_SUMMARIES_PER_SNAPSHOT)
      .map((s) => s.id),
  );
  if (engineResult.setups[0]) {
    llmTargetIds.add(engineResult.setups[0].id);
  }

  const activeAssets = await getActiveAssets();
  const symbolToAssetId = new Map(activeAssets.map((asset) => [asset.symbol, asset.id]));
  const symbolToAsset = new Map(activeAssets.map((asset) => [asset.symbol, asset]));
  const itemRankCounters = new Map<string, number>();
  const items: PerceptionSnapshotItemInput[] = [];
  const updatedSetups: Setup[] = [];
  let overallRank = 0;
  const engineSetups = Array.isArray(engineResult.setups) ? engineResult.setups : [];

  for (const setup of engineSetups) {
    // Resolve assetId before any usage (rings / logs) to avoid TDZ issues.
    const assetId = setup.assetId ?? symbolToAssetId.get(setup.symbol);
    if (!assetId) {
      console.warn("[snapshotBuilder] skipping setup without assetId", {
        setupId: setup.id,
        symbol: setup.symbol,
      });
      continue;
    }

    const breakdown = computeSetupScore({
      trendStrength: setup.eventScore,
      biasScore: setup.biasScore,
      momentum: setup.sentimentScore,
      volatility: Math.abs(setup.eventScore - setup.biasScore),
      pattern: setup.balanceScore,
    });
    const rankingAdjustment = computeSentimentRankingAdjustment(setup.sentiment);
    const adjustedBreakdownTotal = clamp(breakdown.total + rankingAdjustment.delta, 0, 100);
    const adjustedBreakdown = { ...breakdown, total: adjustedBreakdownTotal };

    const effectiveOrderflowScore =
      typeof setup.orderflow?.score === "number" ? setup.orderflow.score : setup.balanceScore ?? 50;
    const rings = computeRingsForSetup({
      breakdown: adjustedBreakdown,
      biasScore: setup.biasScore,
      sentimentScore: setup.sentimentScore,
      balanceScore: setup.balanceScore,
      orderflowScore: effectiveOrderflowScore,
      confidence: setup.confidence,
      direction: setup.direction?.toLowerCase() as "long" | "short" | "neutral" | null,
      assetId,
      symbol: setup.symbol,
      timeframe: setup.timeframe,
      setupId: setup.id,
    });
    const confidence = computeSetupConfidence({
      setupId: setup.id,
      score: adjustedBreakdown,
      rings,
    });

      const ringAiSummary = buildRingAiSummaryForSetup({
        setup: {
          ...setup,
          rings,
          confidence,
          riskReward: setup.riskReward,
        },
      });
      const enhancedRingAiSummary = llmTargetIds.has(setup.id)
        ? await maybeEnhanceRingAiSummaryWithLLM({
            setup: { ...setup, rings, riskReward: setup.riskReward },
            heuristic: ringAiSummary,
          })
        : ringAiSummary;

    const profile = setup.profile ?? deriveSetupProfileFromTimeframe(setup.timeframe);
    let { playbook, reason: playbookReason } = resolvePlaybookWithReason(
      {
        id: assetId,
        symbol: setup.symbol,
        name: symbolToAsset.get(setup.symbol)?.name,
      },
      profile,
    );
    // Safety: ensure swing WTI/Silver do not persist generic playbook if resolver ever falls back.
    if (
      playbook.id === "generic-swing-v0.1" &&
      profile &&
      profile.toUpperCase() !== "INTRADAY"
    ) {
      const aid = assetId.toLowerCase();
      if (aid === "wti") {
        const { playbook: energyPlaybook } = resolvePlaybookWithReason(
          { id: "wti", symbol: setup.symbol, name: symbolToAsset.get(setup.symbol)?.name },
          profile,
        );
        playbook = energyPlaybook;
        playbookReason = `${playbookReason}; forced energy-swing for wti`;
      } else if (aid === "silver") {
        const { playbook: metalsPlaybook } = resolvePlaybookWithReason(
          { id: "silver", symbol: setup.symbol, name: symbolToAsset.get(setup.symbol)?.name },
          profile,
        );
        playbook = metalsPlaybook;
        playbookReason = `${playbookReason}; forced metals-swing for silver`;
      }
    }
    const signalQuality = computeSignalQuality({ ...setup, rings, profile });
    const evaluation = playbook.evaluateSetup({
      asset: { id: assetId, symbol: setup.symbol, name: symbolToAsset.get(setup.symbol)?.name },
      profile: profile ?? null,
      rings: {
        trendScore: rings.trendScore,
        biasScore: rings.biasScore,
        sentimentScore: rings.sentimentScore,
        orderflowScore: rings.orderflowScore,
      },
      eventModifier: setup.eventModifier ?? null,
      signalQuality,
      orderflow: setup.orderflow ?? null,
      levels: {
        entryZone: setup.entryZone,
        stopLoss: setup.stopLoss,
        takeProfit: setup.takeProfit,
        riskReward: setup.riskReward ?? null,
      },
    });

    const assetRank = (itemRankCounters.get(setup.symbol) ?? 0) + 1;
    itemRankCounters.set(setup.symbol, assetRank);
    overallRank += 1;
    items.push({
      id: createId("item"),
      snapshotId,
      assetId,
      setupId: setup.id,
      direction: normalizeDirection(setup.direction),
      rankOverall: overallRank,
      rankWithinAsset: assetRank,
      scoreTotal: adjustedBreakdown.total,
      scoreTrend: breakdown.trend ?? null,
      scoreMomentum: breakdown.momentum ?? null,
      scoreVolatility: breakdown.volatility ?? null,
      scorePattern: breakdown.pattern ?? null,
      confidence,
      biasScore: setup.biasScore ?? null,
      biasScoreAtTime: setup.biasScore ?? null,
      eventContext: setup.eventContext ?? null,
      riskReward: setup.riskReward,
      ringAiSummary: enhancedRingAiSummary,
      isSetupOfTheDay: items.length === 0,
      createdAt: snapshotTime,
    });

    const sentimentWithRanking =
      setup.sentiment != null
        ? {
            ...setup.sentiment,
            rankingDelta: rankingAdjustment.delta,
            rankingHint: rankingAdjustment.hint,
          }
        : setup.sentiment;

    const persistedDecision = derivePersistedDecision(setup, { setupType: evaluation.setupType ?? null });
    const persistedAlignment =
      (setup as { alignment?: string | null }).alignment ??
      (setup as { derivedAlignment?: string | null }).derivedAlignment ??
      null;
    const persistedReasons =
      (setup as { decisionReasons?: string[] | null }).decisionReasons ??
      (setup as { gradeRationale?: string[] | null }).gradeRationale ??
      null;
    const persistedSegment =
      (setup as { watchSegment?: string | null }).watchSegment ??
      (setup as { fxWatchSegment?: string | null }).fxWatchSegment ??
      null;

    updatedSetups.push({
      ...setup,
      rings,
      confidence,
      ringAiSummary: enhancedRingAiSummary,
      sentiment: sentimentWithRanking ?? undefined,
      setupGrade: evaluation.setupGrade,
      setupType: evaluation.setupType,
      gradeRationale: evaluation.gradeRationale,
      noTradeReason: evaluation.noTradeReason,
      profile,
      setupPlaybookId: playbook.id,
      gradeDebugReason: evaluation.debugReason ?? playbookReason,
      // Persisted dimension copies (source-of-truth for Phase-1)
      playbookId: playbook.id,
      grade: evaluation.setupGrade as SetupGrade | null,
      decision: persistedDecision,
      alignment: persistedAlignment,
      decisionReasons: persistedReasons ?? undefined,
      watchSegment: persistedSegment ?? undefined,
    });
  }

  const isoCreatedAt = snapshotTime.toISOString();
  const setupsWithMetadata = updatedSetups.map((setup) => ({
    ...setup,
    snapshotId,
    snapshotCreatedAt: isoCreatedAt,
    ringAiSummary: setup.ringAiSummary ?? null,
  }));

  let notes: string | null = null;
  if (params.source) {
    notes = JSON.stringify({ source: params.source });
  }

  const snapshot: PerceptionSnapshotInput = {
    id: snapshotId,
    snapshotTime,
    label: params.label ?? deriveSnapshotLabel(snapshotTime),
    version: SNAPSHOT_VERSION,
    dataMode: mode,
    generatedMs,
    notes,
    setups: setupsWithMetadata,
  };

  await saveSnapshotToStore({ snapshot, items });

  const persisted = await getSnapshotByTime({ snapshotTime });
  if (!persisted) {
    throw new Error("Failed to retrieve stored perception snapshot");
  }

  return persisted;
}
