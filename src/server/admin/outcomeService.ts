import { getAssetById } from "@/src/server/repositories/assetRepository";
import { getSnapshotById } from "@/src/server/repositories/perceptionSnapshotRepository";
import {
  listOutcomesForWindow,
  type SetupOutcomeRow,
} from "@/src/server/repositories/setupOutcomeRepository";
import type { OutcomeStatus } from "@/src/server/services/outcomeEvaluator";
import type { Setup } from "@/src/lib/engine/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export type OutcomeStats = {
  totals: Record<OutcomeStatus, number>;
  byGrade: Record<string, Record<OutcomeStatus, number>>;
  winRate: number | null;
  expiredShare: number | null;
  ambiguousShare: number | null;
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

export async function loadOutcomeStats(params: { days?: number; assetId?: string }): Promise<OutcomeStats> {
  const days = params.days ?? 30;
  const from = new Date(Date.now() - days * DAY_MS);
  const rows = await listOutcomesForWindow({
    from,
    assetId: params.assetId,
    profile: "SWING",
    timeframe: "1D",
    limit: 300,
  });

  const initBucket = (): Record<OutcomeStatus, number> => ({
    open: 0,
    hit_tp: 0,
    hit_sl: 0,
    expired: 0,
    ambiguous: 0,
  });

  const totals: Record<OutcomeStatus, number> = initBucket();
  const byGrade: Record<string, Record<OutcomeStatus, number>> = {};

  for (const row of rows) {
    const grade = row.setupGrade ?? "unknown";
    const status = row.outcomeStatus as OutcomeStatus;
    const bucket = byGrade[grade] ?? initBucket();
    byGrade[grade] = bucket;
    bucket[status] = (bucket[status] ?? 0) + 1;
    totals[status] = (totals[status] ?? 0) + 1;
  }

  const closed = totals.hit_tp + totals.hit_sl;
  const winRate = closed > 0 ? totals.hit_tp / closed : null;
  const totalCount = rows.length;
  const expiredShare = totalCount > 0 ? totals.expired / totalCount : null;
  const ambiguousShare = totalCount > 0 ? totals.ambiguous / totalCount : null;

  const assetIds = Array.from(new Set(rows.map((r) => r.assetId).filter(Boolean)));
  const assetMap: Record<string, string> = {};
  for (const assetId of assetIds) {
    const asset = await getAssetById(assetId);
    if (asset?.symbol) {
      assetMap[assetId] = asset.symbol;
    }
  }

  const recent = rows.slice(0, 10).map((row) => ({
    ...row,
    assetSymbol: assetMap[row.assetId],
  }));

  return {
    totals,
    byGrade,
    winRate,
    expiredShare,
    ambiguousShare,
    recent,
  };
}

export async function loadOutcomeExportRows(params: {
  days?: number;
  assetId?: string;
}): Promise<OutcomeExportRow[]> {
  const days = params.days ?? 30;
  const from = new Date(Date.now() - days * DAY_MS);
  const rows = await listOutcomesForWindow({
    from,
    assetId: params.assetId,
    profile: "SWING",
    timeframe: "1D",
    limit: 500,
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
