import { logger } from "@/src/lib/logger";
import type { Setup } from "@/src/lib/engine/types";
import { listSnapshotsPaged } from "@/src/server/repositories/perceptionSnapshotRepository";
import { getOutcomesBySetupIds, upsertOutcome, type SetupOutcomeInsert } from "@/src/server/repositories/setupOutcomeRepository";
import { evaluateSwingSetupOutcome, type OutcomeStatus } from "@/src/server/services/outcomeEvaluator";
import { resolvePlaybook } from "@/src/lib/engine/playbooks";

const runnerLogger = logger.child({ scope: "outcome-runner" });
const DAY_MS = 24 * 60 * 60 * 1000;

export type SwingSetupCandidate = Setup & { snapshotId: string; snapshotTime: Date };

export type OutcomeMetrics = {
  evaluated: number;
  hit_tp: number;
  hit_sl: number;
  expired: number;
  ambiguous: number;
  still_open: number;
  errors: number;
  skippedClosed: number;
};

export async function loadRecentSwingCandidates(params: {
  daysBack?: number;
  limit?: number;
  assetId?: string;
  playbookId?: string;
  reasons?: Record<string, number>;
  stats?: { snapshotsSeen: number; rawSetups: number; eligible: number };
  mismatchedAssets?: Record<string, number>;
  playbookMatchStats?: { stored: number; resolved: number; incompatible: number };
  playbookSamples?: Array<{
    setupId: string;
    storedPlaybookId: string | null;
    resolvedPlaybookId: string | null;
    effectivePlaybookId: string | null;
    compatible: boolean;
  }>;
}): Promise<SwingSetupCandidate[]> {
  const daysBack = params.daysBack ?? 30;
  const limit = Math.min(500, Math.max(1, params.limit ?? 200));
  const from = new Date(Date.now() - daysBack * DAY_MS);
  const assetFilter = resolveAssetIds(params.assetId);
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
        params.stats && (params.stats.rawSetups += 1);
        if (seen.has(raw.id)) continue;
        if ((raw.profile ?? "").toUpperCase() !== "SWING") continue;
        if ((raw.timeframe ?? "").toUpperCase() !== "1D") continue;
        const matchesAsset =
          !assetFilter || assetFilter.includes(raw.assetId) || assetFilter.includes((raw as { symbol?: string }).symbol ?? "");
        const playbookId = (raw as { setupPlaybookId?: string | null }).setupPlaybookId ?? null;
        let effectivePlaybookId = playbookId;
        let resolvedPlaybookId: string | null = null;

        if (!effectivePlaybookId) {
          resolvedPlaybookId = resolvePlaybook(
            {
              id: raw.assetId ?? "",
              symbol: (raw as { symbol?: string }).symbol ?? raw.assetId ?? "",
              name: (raw as { name?: string }).name ?? null,
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
            const key = raw.assetId || (raw as { symbol?: string }).symbol || "unknown";
            params.mismatchedAssets[key] = (params.mismatchedAssets[key] ?? 0) + 1;
          }
          continue;
        }

        if (playbookFilter && !playbookMatch) {
          params.reasons && incrementReason(params.reasons, "playbook_mismatch");
          continue;
        }
        if (!raw.entryZone || !raw.stopLoss || !raw.takeProfit) {
          params.reasons && incrementReason(params.reasons, "missing_levels");
          continue;
        }
        seen.add(raw.id);
        params.stats && (params.stats.eligible += 1);
        candidates.push({
          ...raw,
          snapshotId: snapshot.id,
          snapshotTime,
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
  processed: number;
  reasons: Record<string, number>;
  stats: { snapshots: number; extractedSetups: number; eligible: number; skippedClosed: number };
  sampleSetupIds: string[];
  mismatchedAssets: Record<string, number>;
  playbookMatchStats: { stored: number; resolved: number; incompatible: number };
  effectivePlaybookSamples: Array<{
    setupId: string;
    storedPlaybookId: string | null;
    resolvedPlaybookId: string | null;
    effectivePlaybookId: string | null;
    compatible: boolean;
  }>;
}> {
  const reasonCounts: Record<string, number> = {};
  const stats = { snapshotsSeen: 0, rawSetups: 0, eligible: 0 };
  const mismatchedAssets: Record<string, number> = {};
  const playbookMatchStats = { stored: 0, resolved: 0, incompatible: 0 };
  const playbookSamples: Array<{
    setupId: string;
    storedPlaybookId: string | null;
    resolvedPlaybookId: string | null;
    effectivePlaybookId: string | null;
    compatible: boolean;
  }> = [];
  const candidates = await loadRecentSwingCandidates({
    daysBack: params.daysBack,
    limit: params.limit,
    assetId: params.assetId,
    playbookId: params.playbookId,
    reasons: reasonCounts,
    stats,
    mismatchedAssets,
    playbookMatchStats,
    playbookSamples,
  });

  const existing = await getOutcomesBySetupIds(candidates.map((c) => c.id));
  const metrics: OutcomeMetrics = {
    evaluated: 0,
    hit_tp: 0,
    hit_sl: 0,
    expired: 0,
    ambiguous: 0,
    still_open: 0,
    errors: 0,
    skippedClosed: 0,
  };

  for (const candidate of candidates) {
    const prior = existing[candidate.id];
    if (prior && prior.outcomeStatus !== "open") {
      metrics.skippedClosed += 1;
      continue;
    }

    try {
      const result = await evaluateSwingSetupOutcome({
        setup: candidate,
        snapshotTime: candidate.snapshotTime,
        windowBars: params.windowBars,
      });
      metrics.evaluated += 1;
      if (result.outcomeStatus === "hit_tp") metrics.hit_tp += 1;
      if (result.outcomeStatus === "hit_sl") metrics.hit_sl += 1;
      if (result.outcomeStatus === "expired") metrics.expired += 1;
      if (result.outcomeStatus === "ambiguous") metrics.ambiguous += 1;
      if (result.outcomeStatus === "open") metrics.still_open += 1;

      if (params.dryRun) {
        continue;
      }

      const fallbackPlaybook = resolvePlaybook(
        { id: candidate.assetId, symbol: candidate.symbol, name: candidate.symbol },
        candidate.profile ?? "SWING",
      );
      const payload: SetupOutcomeInsert = {
        id: prior?.id,
        setupId: candidate.id,
        snapshotId: candidate.snapshotId ?? "unknown",
        assetId: candidate.assetId,
        profile: (candidate.profile ?? "SWING").toUpperCase(),
        timeframe: candidate.timeframe,
        direction: candidate.direction,
        playbookId: (candidate as { playbookId?: string; setupPlaybookId?: string }).playbookId ??
          (candidate as { setupPlaybookId?: string }).setupPlaybookId ??
          fallbackPlaybook.id ??
          null,
        setupGrade: candidate.setupGrade ?? null,
        setupType: candidate.setupType ?? null,
        gradeRationale: candidate.gradeRationale ?? null,
        noTradeReason: candidate.noTradeReason ?? null,
        gradeDebugReason: (candidate as { gradeDebugReason?: string }).gradeDebugReason ?? null,
        evaluatedAt: new Date(),
        windowBars: result.windowBars,
        outcomeStatus: result.outcomeStatus,
        outcomeAt: result.outcomeAt,
        barsToOutcome: result.barsToOutcome,
        reason: result.reason,
      };

      await upsertOutcome(payload);
    } catch (error) {
      metrics.errors += 1;
      runnerLogger.error("failed to evaluate outcome", { error });
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
    stats: statsResult,
    sampleSetupIds: candidates.slice(0, 5).map((c) => c.id),
    mismatchedAssets,
    playbookMatchStats,
    effectivePlaybookSamples: playbookSamples,
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

function isCompatiblePlaybook(filter: string, resolved: string | null): boolean {
  if (!resolved) return false;
  if (filter === resolved) return true;
  if (filter.startsWith("gold-swing") && resolved.startsWith("gold-swing")) return true;
  return false;
}
