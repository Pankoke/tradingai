import { logger } from "@/src/lib/logger";
import type { Setup } from "@/src/lib/engine/types";
import { listSnapshotsPaged } from "@/src/server/repositories/perceptionSnapshotRepository";
import {
  getOutcomesBySnapshotAndSetupIds,
  upsertOutcome,
  type SetupOutcomeInsert,
} from "@/src/server/repositories/setupOutcomeRepository";
import { evaluateSwingSetupOutcome, type OutcomeStatus } from "@/src/server/services/outcomeEvaluator";
import { resolvePlaybook } from "@/src/lib/engine/playbooks";

const runnerLogger = logger.child({ scope: "outcome-runner" });
const DAY_MS = 24 * 60 * 60 * 1000;
const ENGINE_VERSION = process.env.SETUP_ENGINE_VERSION ?? "unknown";

export type SwingSetupCandidate = Setup & {
  snapshotId: string;
  snapshotTime: Date;
  effectivePlaybookId?: string | null;
  resolvedPlaybookId?: string | null;
  storedPlaybookId?: string | null;
};

export type OutcomeMetrics = {
  evaluated: number;
  hit_tp: number;
  hit_sl: number;
  expired: number;
  ambiguous: number;
  still_open: number;
  invalid: number;
  errors: number;
  skippedClosed: number;
};

type GoldSampleSetup = {
  setupId: string;
  snapshotId: string;
  assetId?: string | null;
  symbol?: string | null;
  timeframe?: string | null;
  profile?: string | null;
  playbookIdStored?: string | null;
  playbookIdResolved?: string | null;
  playbookIdEffective?: string | null;
  hasEntryZone: boolean;
  hasStopLoss: boolean;
  hasTakeProfit: boolean;
  hasLevels: boolean;
  hasRiskReward: boolean;
  hasDirection: boolean;
};

export async function loadRecentSwingCandidates(params: {
  daysBack?: number;
  limit?: number;
  assetId?: string;
  playbookId?: string;
  reasons?: Record<string, number>;
  reasonSamples?: Record<string, string[]>;
  stats?: { snapshotsSeen: number; rawSetups: number; eligible: number };
  mismatchedAssets?: Record<string, number>;
  mismatchedPlaybooks?: Record<string, number>;
  playbookMatchStats?: { stored: number; resolved: number; incompatible: number };
  playbookSamples?: Array<{
    setupId: string;
    storedPlaybookId: string | null;
    resolvedPlaybookId: string | null;
    effectivePlaybookId: string | null;
    compatible: boolean;
  }>;
  goldCounters?: { extracted: number; eligible: number };
  goldReasonCounts?: Record<string, number>;
  goldReasonSamples?: Record<string, string[]>;
  goldSamplesIneligible?: Array<GoldSampleSetup>;
  goldSamplesEligible?: Array<GoldSampleSetup>;
}): Promise<SwingSetupCandidate[]> {
  const daysBack = params.daysBack ?? 30;
  const limit = Math.min(500, Math.max(1, params.limit ?? 200));
  const from = new Date(Date.now() - daysBack * DAY_MS);
  const assetFilter = resolveAssetIds(params.assetId);
  const assetFilterUpper = assetFilter?.map((a) => a.toUpperCase());
  const playbookFilter = params.playbookId ?? null;
  const pageSize = 50;
  let page = 1;
  let total = Infinity;
  const seen = new Set<string>();
  const candidates: SwingSetupCandidate[] = [];

  while (candidates.length < limit && (page - 1) * pageSize < total) {
    const { snapshots, total: fetchedTotal } = await listSnapshotsPaged({
      filters: { from },
      page,
      pageSize,
    });
    total = fetchedTotal;
    params.stats && (params.stats.snapshotsSeen += snapshots.length);
    if (!snapshots.length) break;
    for (const snapshot of snapshots) {
      if (!snapshot.setups || !Array.isArray(snapshot.setups)) continue;
      const snapshotTime = snapshot.snapshotTime instanceof Date ? snapshot.snapshotTime : new Date(snapshot.snapshotTime);
      for (const raw of snapshot.setups as Setup[]) {
        const assetId = (raw.assetId ?? "").toString();
        const symbol = ((raw as { symbol?: string }).symbol ?? "").toString();
        const name = ((raw as { name?: string }).name ?? null)?.toString() ?? null;
        const assetUpper = assetId.toUpperCase();
        const symbolUpper = symbol.toUpperCase();
        const isGold =
          assetUpper === "GC=F" ||
          assetUpper === "XAUUSD" ||
          assetUpper === "XAUUSD=X" ||
          assetUpper === "GOLD" ||
          symbolUpper === "GC=F" ||
          symbolUpper === "XAUUSD" ||
          symbolUpper === "XAUUSD=X" ||
          symbolUpper === "GOLD";
        if (isGold) {
          params.goldCounters && (params.goldCounters.extracted += 1);
        }
        params.stats && (params.stats.rawSetups += 1);
        const seenKey = `${snapshot.id}|${raw.id}`;
        if (seen.has(seenKey)) continue;
        if ((raw.profile ?? "").toUpperCase() !== "SWING") {
          if (isGold) {
            recordGoldReason("non_swing_or_non_1d", params, raw, snapshot.id, null, null, null);
          }
          continue;
        }
        if ((raw.timeframe ?? "").toUpperCase() !== "1D") {
          if (isGold) {
            recordGoldReason("non_swing_or_non_1d", params, raw, snapshot.id, null, null, null);
          }
          continue;
        }
        const matchesAsset =
          !assetFilterUpper ||
          assetFilterUpper.includes(assetUpper) ||
          (symbolUpper ? assetFilterUpper.includes(symbolUpper) : false);
        const playbookId = (raw as { setupPlaybookId?: string | null }).setupPlaybookId ?? null;
        let effectivePlaybookId = playbookId;
        let resolvedPlaybookId: string | null = null;

        if (!effectivePlaybookId) {
          const resolverAssetId = assetUpper === "GOLD" ? "GC=F" : assetId || symbol || "";
          const resolverSymbol = symbolUpper || resolverAssetId;
          resolvedPlaybookId = resolvePlaybook(
            {
              id: resolverAssetId,
              symbol: resolverSymbol,
              name,
            },
            raw.profile ?? "SWING",
          ).id;
          effectivePlaybookId = resolvedPlaybookId;
        }

        const playbookMatch = playbookFilter ? isCompatiblePlaybook(playbookFilter, effectivePlaybookId) : true;

        if (playbookFilter) {
          if (playbookId && playbookMatch) {
            params.playbookMatchStats && (params.playbookMatchStats.stored += 1);
          } else if (!playbookId && playbookMatch) {
            params.playbookMatchStats && (params.playbookMatchStats.resolved += 1);
          } else if (!playbookMatch) {
            params.playbookMatchStats && (params.playbookMatchStats.incompatible += 1);
          }
          if (params.playbookSamples && params.playbookSamples.length < 5) {
            params.playbookSamples.push({
              setupId: raw.id,
              storedPlaybookId: playbookId,
              resolvedPlaybookId,
              effectivePlaybookId,
              compatible: playbookMatch,
            });
          }
        }

        if (assetFilter && !matchesAsset) {
          params.reasons && incrementReason(params.reasons, "asset_mismatch");
          if (params.mismatchedAssets) {
            const key = assetId || symbol || "unknown";
            params.mismatchedAssets[key] = (params.mismatchedAssets[key] ?? 0) + 1;
          }
          if (params.reasonSamples && (params.reasonSamples.asset_mismatch ?? []).length < 10) {
            params.reasonSamples.asset_mismatch = [...(params.reasonSamples.asset_mismatch ?? []), raw.id];
          }
          if (isGold) {
            recordGoldReason("asset_mismatch", params, raw, snapshot.id, playbookId, resolvedPlaybookId, effectivePlaybookId);
          }
          continue;
        }

        if (playbookFilter && !playbookMatch) {
          params.reasons && incrementReason(params.reasons, "playbook_mismatch");
          if (params.mismatchedPlaybooks) {
            const key = effectivePlaybookId ?? "unknown";
            params.mismatchedPlaybooks[key] = (params.mismatchedPlaybooks[key] ?? 0) + 1;
          }
          if (params.reasonSamples && (params.reasonSamples.playbook_mismatch ?? []).length < 10) {
            params.reasonSamples.playbook_mismatch = [...(params.reasonSamples.playbook_mismatch ?? []), raw.id];
          }
          if (isGold) {
            recordGoldReason("playbook_mismatch", params, raw, snapshot.id, playbookId, resolvedPlaybookId, effectivePlaybookId);
          }
          continue;
        }
        if (!raw.entryZone || !raw.stopLoss || !raw.takeProfit) {
          params.reasons && incrementReason(params.reasons, "missing_levels");
          if (params.reasonSamples && (params.reasonSamples.missing_levels ?? []).length < 10) {
            params.reasonSamples.missing_levels = [...(params.reasonSamples.missing_levels ?? []), raw.id];
          }
          if (isGold) {
            recordGoldReason("missing_levels", params, raw, snapshot.id, playbookId, resolvedPlaybookId, effectivePlaybookId);
          }
          continue;
        }
        seen.add(seenKey);
        params.stats && (params.stats.eligible += 1);
        if (isGold) {
          params.goldCounters && (params.goldCounters.eligible += 1);
          if (params.goldSamplesEligible && params.goldSamplesEligible.length < 10) {
            params.goldSamplesEligible.push(
              buildGoldSample(raw, snapshot.id, playbookId, resolvedPlaybookId, effectivePlaybookId),
            );
          }
        }
        candidates.push({
          ...raw,
          snapshotId: snapshot.id,
          snapshotTime,
          effectivePlaybookId,
          resolvedPlaybookId,
          storedPlaybookId: playbookId,
        });
        if (candidates.length >= limit) break;
      }
      if (candidates.length >= limit) break;
    }
    page += 1;
  }

  return candidates;
}

export async function runOutcomeEvaluationBatch(params: {
  daysBack?: number;
  limit?: number;
  dryRun?: boolean;
  windowBars?: number;
  assetId?: string;
  playbookId?: string;
  loggerInfo?: boolean;
}): Promise<{
  metrics: OutcomeMetrics;
  inserted: number;
  updated: number;
  unchanged: number;
  processed: number;
  reasons: Record<string, number>;
  reasonSamples: Record<string, string[]>;
  stats: { snapshots: number; extractedSetups: number; eligible: number; skippedClosed: number };
  sampleSetupIds: string[];
  mismatchedAssets: Record<string, number>;
  mismatchedPlaybooks: Record<string, number>;
  playbookMatchStats: { stored: number; resolved: number; incompatible: number };
  effectivePlaybookSamples: Array<{
    setupId: string;
    storedPlaybookId: string | null;
    resolvedPlaybookId: string | null;
    effectivePlaybookId: string | null;
    compatible: boolean;
  }>;
  goldStats: { extracted: number; eligible: number };
  goldReasonCounts: Record<string, number>;
  goldReasonSamples: Record<string, string[]>;
  goldSampleIneligible: GoldSampleSetup[];
  goldSampleEligible: GoldSampleSetup[];
}> {
  const reasonCounts: Record<string, number> = {};
  const reasonSamples: Record<string, string[]> = {};
  const stats = { snapshotsSeen: 0, rawSetups: 0, eligible: 0 };
  const mismatchedAssets: Record<string, number> = {};
  const mismatchedPlaybooks: Record<string, number> = {};
  const playbookMatchStats = { stored: 0, resolved: 0, incompatible: 0 };
  const playbookSamples: Array<{
    setupId: string;
    storedPlaybookId: string | null;
    resolvedPlaybookId: string | null;
    effectivePlaybookId: string | null;
    compatible: boolean;
  }> = [];
  const goldStats = { extracted: 0, eligible: 0 };
  const goldReasonCounts: Record<string, number> = {};
  const goldReasonSamples: Record<string, string[]> = {};
  const goldSampleIneligible: GoldSampleSetup[] = [];
  const goldSampleEligible: GoldSampleSetup[] = [];
  const candidates = await loadRecentSwingCandidates({
    daysBack: params.daysBack,
    limit: params.limit,
    assetId: params.assetId,
    playbookId: params.playbookId,
    reasons: reasonCounts,
    reasonSamples,
    stats,
    mismatchedAssets,
    mismatchedPlaybooks,
    playbookMatchStats,
    playbookSamples,
    goldCounters: goldStats,
    goldReasonCounts,
    goldReasonSamples,
    goldSamplesIneligible: goldSampleIneligible,
    goldSamplesEligible: goldSampleEligible,
  });

  const existing = await getOutcomesBySnapshotAndSetupIds(
    candidates.map((c) => ({ snapshotId: c.snapshotId, setupId: c.id })),
  );
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  const metrics: OutcomeMetrics = {
    evaluated: 0,
    hit_tp: 0,
    hit_sl: 0,
    expired: 0,
    ambiguous: 0,
    still_open: 0,
    invalid: 0,
    errors: 0,
    skippedClosed: 0,
  };

  for (const candidate of candidates) {
    const anchorTime =
      (candidate as { generatedAt?: Date | string | null }).generatedAt != null
        ? new Date((candidate as { generatedAt?: Date | string | null }).generatedAt as string)
        : candidate.snapshotTime ?? null;
    if (!anchorTime) {
      incrementReason(reasonCounts, "missing_anchor_time");
      recordGoldReason("missing_anchor_time", { goldReasonCounts, goldReasonSamples, goldSamplesIneligible: goldSampleIneligible }, candidate, candidate.snapshotId, (candidate as { setupPlaybookId?: string | null }).setupPlaybookId ?? null, null, null);
      continue;
    }

    const priorKey = `${candidate.snapshotId}|${candidate.id}`;
    const prior = existing[priorKey];
    if (prior && prior.outcomeStatus !== "open") {
      metrics.skippedClosed += 1;
      continue;
    }

    try {
      const result = await evaluateSwingSetupOutcome({
        setup: candidate,
        snapshotTime: anchorTime,
        windowBars: params.windowBars,
      });
      metrics.evaluated += 1;
      if (result.outcomeStatus === "hit_tp") metrics.hit_tp += 1;
      if (result.outcomeStatus === "hit_sl") metrics.hit_sl += 1;
      if (result.outcomeStatus === "expired") metrics.expired += 1;
      if (result.outcomeStatus === "ambiguous") metrics.ambiguous += 1;
      if (result.outcomeStatus === "invalid") metrics.invalid += 1;
      if (result.outcomeStatus === "open") metrics.still_open += 1;

      if (params.dryRun) {
        continue;
      }

      const fallbackPlaybook = resolvePlaybook(
        { id: candidate.assetId, symbol: candidate.symbol, name: candidate.symbol },
        candidate.profile ?? "SWING",
      );
      const effectivePlaybookId =
        candidate.effectivePlaybookId ??
        (candidate as { setupPlaybookId?: string | null }).setupPlaybookId ??
        fallbackPlaybook.id ??
        null;
      const payload: SetupOutcomeInsert = {
        id: prior?.id,
        setupId: candidate.id,
        snapshotId: candidate.snapshotId ?? "unknown",
        assetId: candidate.assetId,
        profile: (candidate.profile ?? "SWING").toUpperCase(),
        timeframe: candidate.timeframe,
        direction: candidate.direction,
        playbookId: effectivePlaybookId,
        setupGrade: candidate.setupGrade ?? null,
        setupType: candidate.setupType ?? null,
        gradeRationale: candidate.gradeRationale ?? null,
        noTradeReason: candidate.noTradeReason ?? null,
        gradeDebugReason: buildDebugReason((candidate as { gradeDebugReason?: string }).gradeDebugReason),
        evaluatedAt: new Date(),
        windowBars: result.windowBars,
        outcomeStatus: result.outcomeStatus,
        outcomeAt: result.outcomeAt,
        barsToOutcome: result.barsToOutcome,
        reason: result.reason,
      };

      await upsertOutcome(payload);
      if (!prior) {
        inserted += 1;
      } else if (prior.outcomeStatus !== result.outcomeStatus || prior.evaluatedAt !== payload.evaluatedAt) {
        updated += 1;
      } else {
        unchanged += 1;
      }
    } catch (error) {
      metrics.errors += 1;
      runnerLogger.error("failed to evaluate outcome", { error });
      const isGold =
        (candidate.assetId ?? "").toUpperCase() === "GC=F" ||
        (candidate.assetId ?? "").toUpperCase() === "XAUUSD" ||
        (candidate.assetId ?? "").toUpperCase() === "XAUUSD=X" ||
        (candidate.assetId ?? "").toUpperCase() === "GOLD" ||
        ((candidate as { symbol?: string }).symbol ?? "").toUpperCase() === "GC=F" ||
        ((candidate as { symbol?: string }).symbol ?? "").toUpperCase() === "XAUUSD" ||
        ((candidate as { symbol?: string }).symbol ?? "").toUpperCase() === "XAUUSD=X" ||
        ((candidate as { symbol?: string }).symbol ?? "").toUpperCase() === "GOLD";
      const errMsg = error instanceof Error ? error.message : "error";
      const reasonKey = errMsg.toLowerCase().includes("candle") ? "insufficient_forward_candles" : "evaluation_error";
      incrementReason(reasonCounts, reasonKey);
      if (reasonSamples[reasonKey]?.length ?? 0 < 10) {
        reasonSamples[reasonKey] = [...(reasonSamples[reasonKey] ?? []), candidate.id];
      }
      if (isGold) {
        recordGoldReason(
          reasonKey === "insufficient_forward_candles" ? "insufficient_forward_candles" : "other",
          { goldReasonCounts, goldReasonSamples, goldSamplesIneligible: goldSampleIneligible },
          candidate,
          candidate.snapshotId,
          (candidate as { setupPlaybookId?: string | null }).setupPlaybookId ?? null,
          null,
          null,
        );
      }
    }
  }

  if (params.loggerInfo) {
    runnerLogger.info("outcome evaluation run", {
      daysBack: params.daysBack ?? 30,
      limit: params.limit,
      processed: candidates.length,
      metrics,
      reasons: topReasons(reasonCounts),
      stats: {
        snapshots: stats.snapshotsSeen,
        extractedSetups: stats.rawSetups,
        eligible: stats.eligible,
        skippedClosed: metrics.skippedClosed,
      },
    });
  }

  const statsResult = {
    snapshots: stats.snapshotsSeen,
    extractedSetups: stats.rawSetups,
    eligible: stats.eligible,
    skippedClosed: metrics.skippedClosed,
  };

  return {
    metrics,
    processed: candidates.length,
    reasons: reasonCounts,
    reasonSamples,
    stats: statsResult,
    sampleSetupIds: candidates.slice(0, 5).map((c) => c.id),
    mismatchedAssets,
    mismatchedPlaybooks,
    playbookMatchStats,
    effectivePlaybookSamples: playbookSamples,
    inserted,
    updated,
    unchanged,
    goldStats,
    goldReasonCounts,
    goldReasonSamples,
    goldSampleIneligible,
    goldSampleEligible,
  };
}

function resolveAssetIds(assetId?: string | null): string[] | undefined {
  if (!assetId) return undefined;
  const trimmed = assetId.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "gold") return ["GC=F", "XAUUSD", "XAUUSD=X", "GOLD", "gold"];
  return [trimmed];
}

function incrementReason(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function topReasons(map: Record<string, number>): Array<{ reason: string; count: number }> {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));
}

function buildDebugReason(existing?: string | null): string | null {
  const suffix = `engine=${ENGINE_VERSION}`;
  if (existing && existing.length) {
    if (existing.includes("engine=")) return existing;
    return `${existing};${suffix}`;
  }
  return suffix;
}

function isCompatiblePlaybook(filter: string, resolved: string | null): boolean {
  if (!resolved) return false;
  if (filter === resolved) return true;
  if (filter.startsWith("gold-swing") && resolved.startsWith("gold-swing")) return true;
  return false;
}

function recordGoldReason(
  reason: string,
  params: {
    goldReasonCounts?: Record<string, number>;
    goldReasonSamples?: Record<string, string[]>;
    goldSamplesIneligible?: Array<GoldSampleSetup>;
  },
  raw: Setup,
  snapshotId: string,
  playbookId: string | null,
  resolvedPlaybookId: string | null,
  effectivePlaybookId: string | null,
) {
  if (params.goldReasonCounts) {
    params.goldReasonCounts[reason] = (params.goldReasonCounts[reason] ?? 0) + 1;
  }
  if (params.goldReasonSamples) {
    const existing = params.goldReasonSamples[reason] ?? [];
    if (existing.length < 10) {
      params.goldReasonSamples[reason] = [...existing, raw.id];
    } else if (!params.goldReasonSamples[reason]) {
      params.goldReasonSamples[reason] = existing;
    }
  }
  if (params.goldSamplesIneligible && params.goldSamplesIneligible.length < 10) {
    params.goldSamplesIneligible.push(buildGoldSample(raw, snapshotId, playbookId, resolvedPlaybookId, effectivePlaybookId));
  }
}

function buildGoldSample(
  raw: Setup,
  snapshotId: string,
  playbookId: string | null,
  resolvedPlaybookId: string | null,
  effectivePlaybookId: string | null,
): GoldSampleSetup {
  const hasEntryZone = Boolean(raw.entryZone);
  const hasStopLoss = Boolean(raw.stopLoss);
  const hasTakeProfit = Boolean(raw.takeProfit);
  const hasLevels = hasEntryZone && hasStopLoss && hasTakeProfit;
  const hasRiskReward = raw.riskReward != null;
  const hasDirection = Boolean(raw.direction);
  return {
    setupId: raw.id,
    snapshotId,
    assetId: raw.assetId ?? null,
    symbol: (raw as { symbol?: string }).symbol ?? null,
    timeframe: raw.timeframe ?? null,
    profile: raw.profile ?? null,
    playbookIdStored: playbookId,
    playbookIdResolved: resolvedPlaybookId,
    playbookIdEffective: effectivePlaybookId,
    hasEntryZone,
    hasStopLoss,
    hasTakeProfit,
    hasLevels,
    hasRiskReward,
    hasDirection,
  };
}
