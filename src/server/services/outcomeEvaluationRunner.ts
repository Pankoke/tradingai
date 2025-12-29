import { logger } from "@/src/lib/logger";
import type { Setup } from "@/src/lib/engine/types";
import { listSnapshotsPaged } from "@/src/server/repositories/perceptionSnapshotRepository";
import { getOutcomesBySetupIds, upsertOutcome, type SetupOutcomeInsert } from "@/src/server/repositories/setupOutcomeRepository";
import { evaluateSwingSetupOutcome, type OutcomeStatus } from "@/src/server/services/outcomeEvaluator";

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
}): Promise<SwingSetupCandidate[]> {
  const daysBack = params.daysBack ?? 30;
  const limit = Math.min(500, Math.max(1, params.limit ?? 200));
  const from = new Date(Date.now() - daysBack * DAY_MS);
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
    if (!snapshots.length) break;
    for (const snapshot of snapshots) {
      if (!snapshot.setups || !Array.isArray(snapshot.setups)) continue;
      const snapshotTime = snapshot.snapshotTime instanceof Date ? snapshot.snapshotTime : new Date(snapshot.snapshotTime);
      for (const raw of snapshot.setups as Setup[]) {
        if (seen.has(raw.id)) continue;
        if ((raw.profile ?? "").toUpperCase() !== "SWING") continue;
        if ((raw.timeframe ?? "").toUpperCase() !== "1D") continue;
        seen.add(raw.id);
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
}): Promise<{ metrics: OutcomeMetrics; processed: number }> {
  const candidates = await loadRecentSwingCandidates({
    daysBack: params.daysBack,
    limit: params.limit,
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

      const payload: SetupOutcomeInsert = {
        id: prior?.id,
        setupId: candidate.id,
        snapshotId: candidate.snapshotId ?? "unknown",
        assetId: candidate.assetId,
        profile: (candidate.profile ?? "SWING").toUpperCase(),
        timeframe: candidate.timeframe,
        direction: candidate.direction,
        playbookId: (candidate as { playbookId?: string }).playbookId ?? null,
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

  return { metrics, processed: candidates.length };
}
