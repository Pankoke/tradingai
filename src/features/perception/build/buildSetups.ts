import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import { computeSetupConfidence, computeSetupScore } from "@/src/lib/engine/scoring";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";
import type { Setup } from "@/src/lib/engine/types";
import type {
  PerceptionSnapshotItemInput,
  PerceptionSnapshotInput,
  PerceptionSnapshotWithItems,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import {
  getSnapshotByTime,
  insertSnapshotWithItems,
} from "@/src/server/repositories/perceptionSnapshotRepository";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { computeRingsForSetup } from "@/src/lib/engine/rings";
import {
  getPerceptionDataMode,
  type PerceptionDataMode,
} from "@/src/lib/config/perceptionDataMode";
import { buildRingAiSummaryForSetup } from "@/src/lib/engine/modules/ringAiSummary";

export type PerceptionSnapshotEngineResult = PerceptionSnapshot;

type BuildParams = {
  snapshotTime?: Date;
  mode?: PerceptionDataMode;
};

const SNAPSHOT_VERSION = "v1.0.0";

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

export async function buildAndStorePerceptionSnapshot(
  params: BuildParams = {},
): Promise<PerceptionSnapshotWithItems> {
  const snapshotTime = params.snapshotTime ?? new Date();
  const mode: PerceptionDataMode = params.mode ?? getPerceptionDataMode();

  const start = Date.now();
  const engineResult: PerceptionSnapshotEngineResult = await buildPerceptionSnapshot({ asOf: snapshotTime });
  const generatedMs = Date.now() - start;

  const snapshotId = createId("snapshot");

  const activeAssets = await getActiveAssets();
  const symbolToAssetId = new Map(activeAssets.map((asset) => [asset.symbol, asset.id]));
  const itemRankCounters = new Map<string, number>();
  const items: PerceptionSnapshotItemInput[] = [];
  let overallRank = 0;
  for (const setup of engineResult.setups) {
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

    const rings = computeRingsForSetup({
      breakdown,
      biasScore: setup.biasScore,
      sentimentScore: setup.sentimentScore,
      balanceScore: setup.balanceScore,
      confidence: setup.confidence,
      direction: setup.direction?.toLowerCase() as "long" | "short" | "neutral" | null,
      assetId,
      symbol: setup.symbol,
      timeframe: setup.timeframe,
      setupId: setup.id,
    });
    const confidence = computeSetupConfidence({
      setupId: setup.id,
      score: breakdown,
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
      scoreTotal: breakdown.total,
      scoreTrend: breakdown.trend ?? null,
      scoreMomentum: breakdown.momentum ?? null,
      scoreVolatility: breakdown.volatility ?? null,
      scorePattern: breakdown.pattern ?? null,
      confidence,
      biasScore: setup.biasScore ?? null,
      biasScoreAtTime: setup.biasScore ?? null,
      eventContext: setup.eventContext ?? null,
      riskReward: setup.riskReward,
      ringAiSummary,
      isSetupOfTheDay: items.length === 0,
      createdAt: snapshotTime,
    });
  }

  const isoCreatedAt = snapshotTime.toISOString();
  const setupsWithMetadata = engineResult.setups.map((setup) => ({
    ...setup,
    snapshotId,
    snapshotCreatedAt: isoCreatedAt,
    ringAiSummary: setup.ringAiSummary ?? null,
  }));

  const snapshot: PerceptionSnapshotInput = {
    id: snapshotId,
    snapshotTime,
    label: deriveSnapshotLabel(snapshotTime),
    version: SNAPSHOT_VERSION,
    dataMode: mode,
    generatedMs,
    notes: null,
    setups: setupsWithMetadata,
  };

  await insertSnapshotWithItems({ snapshot, items });

  const persisted = await getSnapshotByTime({ snapshotTime });
  if (!persisted) {
    throw new Error("Failed to retrieve stored perception snapshot");
  }

  return persisted;
}
