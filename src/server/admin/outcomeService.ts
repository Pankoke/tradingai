import { getAssetById } from "@/src/server/repositories/assetRepository";
import { getSnapshotById } from "@/src/server/repositories/perceptionSnapshotRepository";
import {
  listOutcomesForWindow,
  aggregateOutcomes,
  type SetupOutcomeRow,
  type OutcomeAggregateRow,
} from "@/src/server/repositories/setupOutcomeRepository";
import type { OutcomeStatus } from "@/src/server/services/outcomeEvaluator";
import type { Setup } from "@/src/lib/engine/types";
import { FIX_DATE } from "@/src/server/services/outcomePolicy";

const DAY_MS = 24 * 60 * 60 * 1000;

export type OutcomeStats = {
  totals: Record<OutcomeStatus, number>;
  byGrade: Record<string, Record<OutcomeStatus, number>>;
  winRate: number | null;
  expiredShare: number | null;
  ambiguousShare: number | null;
  invalidRate: number | null;
  recent: Array<
    SetupOutcomeRow & {
      assetSymbol?: string;
    }
  >;
};

export type OutcomeExportRow = {
  outcome: SetupOutcomeRow;
  setup?: Setup;
};

export type EngineHealthRow = OutcomeAggregateRow & {
  winRate: number | null;
  expiryRate: number | null;
  coverage: number | null;
  samples: string[];
};

export async function loadOutcomeStats(params: { days?: number; assetId?: string; playbookId?: string }): Promise<OutcomeStats> {
  const days = params.days ?? 30;
  const from = new Date(Date.now() - days * DAY_MS);
  const rows = await listOutcomesForWindow({
    from,
    assetId: params.assetId,
    profile: "SWING",
    timeframe: "1D",
    limit: 300,
    playbookId: params.playbookId,
  });
  const cohort = rows.filter(
    (row) =>
      row.evaluatedAt &&
      row.evaluatedAt >= FIX_DATE &&
      (row.outcomeStatus as OutcomeStatus) !== "invalid",
  );

  const initBucket = (): Record<OutcomeStatus, number> => ({
    open: 0,
    hit_tp: 0,
    hit_sl: 0,
    expired: 0,
    ambiguous: 0,
    invalid: 0,
  });

  const totals: Record<OutcomeStatus, number> = initBucket();
  const byGrade: Record<string, Record<OutcomeStatus, number>> = {};

  for (const row of cohort) {
    const grade = row.setupGrade ?? "unknown";
    const status = row.outcomeStatus as OutcomeStatus;
    const bucket = byGrade[grade] ?? initBucket();
    byGrade[grade] = bucket;
    bucket[status] = (bucket[status] ?? 0) + 1;
    totals[status] = (totals[status] ?? 0) + 1;
  }

  const closed = totals.hit_tp + totals.hit_sl;
  const winRate = closed > 0 ? totals.hit_tp / closed : null;
  const totalCount = cohort.length;
  const expiredShare = totalCount > 0 ? totals.expired / totalCount : null;
  const ambiguousShare = totalCount > 0 ? totals.ambiguous / totalCount : null;
  const invalidRate = totalCount > 0 ? (totals.invalid ?? 0) / totalCount : null;

  const assetIds = Array.from(new Set(cohort.map((r) => r.assetId).filter(Boolean)));
  const assetMap: Record<string, string> = {};
  for (const assetId of assetIds) {
    const asset = await getAssetById(assetId);
    if (asset?.symbol) {
      assetMap[assetId] = asset.symbol;
    }
  }

  const recent = cohort.slice(0, 10).map((row) => ({
    ...row,
    assetSymbol: assetMap[row.assetId],
  }));

  return {
    totals,
    byGrade,
    winRate,
    expiredShare,
    ambiguousShare,
    invalidRate,
    recent,
  };
}

export async function loadOutcomeExportRows(params: {
  days?: number;
  assetId?: string;
  playbookId?: string;
  mode?: "all" | "latest";
}): Promise<OutcomeExportRow[]> {
  const days = params.days ?? 30;
  const from = new Date(Date.now() - days * DAY_MS);
  const rows = await listOutcomesForWindow({
    from,
    assetId: params.assetId,
    profile: "SWING",
    timeframe: "1D",
    limit: params.mode === "latest" ? 500 : 5000,
    playbookId: params.playbookId,
    mode: params.mode ?? "all",
  });

  const snapshotCache = new Map<string, Setup[]>();
  const result: OutcomeExportRow[] = [];

  for (const row of rows) {
    let snapshotSetups = snapshotCache.get(row.snapshotId);
    if (!snapshotSetups) {
      const snapshot = await getSnapshotById(row.snapshotId);
      const setups = (snapshot?.setups as Setup[] | undefined) ?? [];
      snapshotCache.set(row.snapshotId, setups);
      snapshotSetups = setups;
    }
    const setup = snapshotSetups.find((s) => s.id === row.setupId);
    result.push({ outcome: row, setup });
  }

  return result;
}

export async function loadEngineHealth(params: {
  days?: number;
  assetId?: string;
  playbookId?: string;
  engineVersion?: string;
  profile?: string;
  timeframe?: string;
  includeUnknown?: boolean;
  includeNullEvalTf?: boolean;
}): Promise<EngineHealthRow[]> {
  const days = params.days ?? 90;
  const from = new Date(Date.now() - days * DAY_MS);
  const cohortFrom = from < FIX_DATE ? FIX_DATE : from;
  const aggregates = await aggregateOutcomes({
    from: cohortFrom,
    assetId: params.assetId,
    playbookId: params.playbookId ?? undefined,
    engineVersion: params.engineVersion,
    profile: (params.profile ?? "SWING").toUpperCase(),
    timeframe: params.timeframe ?? "1D",
    excludeInvalid: true,
  });

  const samplesRaw = await listOutcomesForWindow({
    from: cohortFrom,
    assetId: params.assetId,
    playbookId: params.playbookId ?? undefined,
    engineVersion: params.engineVersion,
    profile: (params.profile ?? "SWING").toUpperCase(),
    timeframe: params.timeframe ?? "1D",
    limit: 200,
  });

  const sampleMap = samplesRaw.reduce<Record<string, string[]>>((acc, row) => {
    const key = `${row.playbookId ?? "unknown"}|${row.setupEngineVersion ?? "unknown"}|${row.timeframe ?? "1D"}`;
    const bucket = acc[key] ?? [];
    if (bucket.length < 10 && row.id) {
      bucket.push(row.id);
    }
    acc[key] = bucket;
    return acc;
  }, {});

  const filteredByTf =
    params.includeNullEvalTf === true ? aggregates : aggregates.filter((row) => (row.evaluationTimeframe ?? "").length > 0);
  const filteredAggregates =
    params.includeUnknown === true
      ? filteredByTf
      : filteredByTf.filter(
          (row) => (row.setupEngineVersion ?? "").trim().length > 0 && (row.setupEngineVersion ?? "unknown") !== "unknown",
        );

  return filteredAggregates.map((row) => {
    const total = Number(row.total ?? 0);
    const tp = Number(row.hit_tp ?? 0);
    const sl = Number(row.hit_sl ?? 0);
    const exp = Number(row.expired ?? 0);
    const amb = Number(row.ambiguous ?? 0);
    const inv = Number(row.invalid ?? 0);
    const closed = tp + sl + exp + amb;
    const winRate = tp + sl > 0 ? tp / (tp + sl) : null;
    const expiryRate = closed > 0 ? exp / closed : null;
    const coverage = total > 0 ? closed / total : null;
    const sampleKey = `${row.playbookId ?? "unknown"}|${row.setupEngineVersion ?? "unknown"}|${row.evaluationTimeframe ?? "1D"}`;
    return {
      ...row,
      total,
      hit_tp: tp,
      hit_sl: sl,
      expired: exp,
      ambiguous: amb,
      invalid: inv,
      winRate,
      expiryRate,
      coverage,
      samples: sampleMap[sampleKey] ?? [],
    };
  });
}
