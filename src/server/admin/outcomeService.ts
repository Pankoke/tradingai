import { getAssetById } from "@/src/server/repositories/assetRepository";
import { getSnapshotById, listSnapshotItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import {
  listOutcomesForWindow,
  aggregateOutcomes,
  aggregateOutcomesByGrade,
  type SetupOutcomeRow,
  type OutcomeAggregateRow,
  type OutcomeGradeAggregateRow,
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
  availablePlaybooks: string[];
  noTradeReasonCounts?: Record<string, number>;
  debug?: {
    days: number;
    assetId?: string;
    playbookId?: string;
    profile: string;
    timeframe: string;
    rowsConsidered: number;
  };
  recent: Array<
    SetupOutcomeRow & {
      assetSymbol?: string;
      biasScoreAtTime?: number | null;
      scoreTrend?: number | null;
      scoreTotal?: number | null;
      confidence?: number | null;
      riskReward?: unknown;
      direction?: string | null;
      gradeDebugReason?: string | null;
      gradeRationale?: string[] | null;
      snapshotTime?: Date | null;
      snapshotCreatedAt?: Date | null;
      snapshotShortId?: string;
      snapshotVersion?: string | null;
    }
  >;
};

export type OutcomeExportRow = {
  outcome: SetupOutcomeRow;
  setup?: Setup;
};

export type OutcomeTotals = {
  totals: OutcomeAggregateRow;
  gradeTotals: OutcomeGradeAggregateRow[];
};

export async function loadOutcomeTotals(params: { days?: number; assetId?: string; playbookId?: string }): Promise<OutcomeTotals> {
  const days = params.days ?? 30;
  const from = new Date(Date.now() - days * DAY_MS);
  const cohortFrom = from < FIX_DATE ? FIX_DATE : from;

  const aggregates = await aggregateOutcomes({
    from,
    cohortFromSnapshot: cohortFrom,
    assetId: params.assetId,
    playbookId: params.playbookId,
    profile: "SWING",
    timeframe: "1D",
    excludeInvalid: false,
  });

  const gradeAggregates = await aggregateOutcomesByGrade({
    from,
    cohortFromSnapshot: cohortFrom,
    assetId: params.assetId,
    playbookId: params.playbookId,
    profile: "SWING",
    timeframe: "1D",
    excludeInvalid: false,
  });

  const totals = aggregates.reduce<OutcomeAggregateRow>(
    (acc, row) => {
      acc.total += Number(row.total ?? 0);
      acc.open += Number(row.open ?? 0);
      acc.hit_tp += Number(row.hit_tp ?? 0);
      acc.hit_sl += Number(row.hit_sl ?? 0);
      acc.expired += Number(row.expired ?? 0);
      acc.ambiguous += Number(row.ambiguous ?? 0);
      acc.invalid += Number(row.invalid ?? 0);
      return acc;
    },
    {
      playbookId: "all",
      setupEngineVersion: null,
      evaluationTimeframe: "1D",
      total: 0,
      open: 0,
      hit_tp: 0,
      hit_sl: 0,
      expired: 0,
      ambiguous: 0,
      invalid: 0,
    },
  );

  return {
    totals,
    gradeTotals: gradeAggregates,
  };
}

export type EngineHealthRow = OutcomeAggregateRow & {
  winRate: number | null;
  expiryRate: number | null;
  coverage: number | null;
  samples: string[];
};

export async function loadOutcomeStats(params: { days?: number; assetId?: string; playbookId?: string }): Promise<OutcomeStats> {
  const days = params.days ?? 30;
  const from = new Date(Date.now() - days * DAY_MS);
  const cohortFrom = from < FIX_DATE ? FIX_DATE : from;
  const rows = await listOutcomesForWindow({
    from,
    cohortFromSnapshot: cohortFrom,
    assetId: params.assetId,
    profile: "SWING",
    timeframe: "1D",
    limit: 300,
    playbookId: params.playbookId,
  });
  const cohort = rows.filter((row) => (row.outcomeStatus as OutcomeStatus) !== "invalid");
  const availablePlaybooks = Array.from(
    new Set(
      cohort
        .map((row) => row.playbookId)
        .filter((pb): pb is string => typeof pb === "string" && pb.trim().length > 0),
    ),
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
  const noTradeReasonCounts: Record<string, number> = {};

  for (const row of cohort) {
    const grade = row.setupGrade ?? "unknown";
    const status = row.outcomeStatus as OutcomeStatus;
    const bucket = byGrade[grade] ?? initBucket();
    byGrade[grade] = bucket;
    bucket[status] = (bucket[status] ?? 0) + 1;
    totals[status] = (totals[status] ?? 0) + 1;
    if (grade === "NO_TRADE" && row.noTradeReason) {
      noTradeReasonCounts[row.noTradeReason] = (noTradeReasonCounts[row.noTradeReason] ?? 0) + 1;
    }
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

  const recentBase = cohort.slice(0, 10);
  const snapshotIds = Array.from(new Set(recentBase.map((r) => r.snapshotId)));
  const snapshotItemsBySnapshot: Record<string, Map<string, unknown>> = {};
  const snapshotMeta: Record<
    string,
    { snapshotTime: Date | null; createdAt: Date | null; version: string | null; shortId: string }
  > = {};
  for (const snapId of snapshotIds) {
    const items = await listSnapshotItems(snapId);
    const map = new Map<string, unknown>();
    items.forEach((item) => map.set(item.setupId, item));
    snapshotItemsBySnapshot[snapId] = map;
    const snap = await getSnapshotById(snapId);
    if (snap) {
      snapshotMeta[snapId] = {
        snapshotTime: snap.snapshotTime ?? null,
        createdAt: (snap as { createdAt?: Date | null }).createdAt ?? null,
        version: snap.version ?? null,
        shortId: snap.id.slice(0, 6),
      };
    } else {
      snapshotMeta[snapId] = { snapshotTime: null, createdAt: null, version: null, shortId: snapId.slice(0, 6) };
    }
  }

  const recent = recentBase.map((row) => {
    const item = snapshotItemsBySnapshot[row.snapshotId]?.get(row.setupId) as
      | (typeof import("../db/schema/perceptionSnapshotItems"))["perceptionSnapshotItems"]["$inferSelect"]
      | undefined;
    return {
      ...row,
      assetSymbol: assetMap[row.assetId],
      biasScoreAtTime: item?.biasScoreAtTime ?? item?.biasScore ?? null,
      scoreTrend: item?.scoreTrend ?? null,
      scoreTotal: item?.scoreTotal ?? null,
      confidence: item?.confidence ?? null,
      riskReward: (row as { riskReward?: unknown }).riskReward ?? item?.riskReward ?? null,
      direction: row.direction,
      gradeDebugReason: row.gradeDebugReason ?? null,
      gradeRationale: row.gradeRationale ?? null,
      snapshotTime: snapshotMeta[row.snapshotId]?.snapshotTime ?? null,
      snapshotCreatedAt: snapshotMeta[row.snapshotId]?.createdAt ?? null,
      snapshotShortId: snapshotMeta[row.snapshotId]?.shortId,
      snapshotVersion: snapshotMeta[row.snapshotId]?.version ?? null,
    };
  });

  return {
    totals,
    byGrade,
    winRate,
    expiredShare,
    ambiguousShare,
    invalidRate,
    noTradeReasonCounts: Object.keys(noTradeReasonCounts).length ? noTradeReasonCounts : undefined,
    availablePlaybooks,
    debug: {
      days,
      assetId: params.assetId,
      playbookId: params.playbookId,
      profile: "SWING",
      timeframe: "1D",
      rowsConsidered: cohort.length,
    },
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
    from,
    cohortFromSnapshot: cohortFrom,
    assetId: params.assetId,
    playbookId: params.playbookId ?? undefined,
    engineVersion: params.engineVersion,
    profile: (params.profile ?? "SWING").toUpperCase(),
    timeframe: params.timeframe ?? "1D",
    excludeInvalid: true,
  });

  const samplesRaw = await listOutcomesForWindow({
    from,
    cohortFromSnapshot: cohortFrom,
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
