import path from "node:path";
import { readFile } from "node:fs/promises";

export type OutcomeClass = "TP" | "SL" | "EXPIRED" | "AMBIGUOUS" | "INVALID" | "OPEN" | "UNKNOWN";

export type StatusCounts = Record<OutcomeClass, number>;

export type BucketKey = {
  assetId: string;
  timeframe: string;
  label: string;
  playbookId: string;
  grade: string;
  decisionBucket: string;
};

export type Bucket = {
  key: BucketKey;
  outcomesTotal: number;
  closedCount: number;
  openCount: number;
  tpCount: number;
  slCount: number;
  expiredCount: number;
  ambiguousCount: number;
  invalidCount: number;
  unknownCount: number;
  winrateTpSl: number | null;
  closeRate: number | null;
  flags: {
    tooFewClosed: boolean;
    mostlyOpen: boolean;
  };
  statusCounts: StatusCounts;
};

export type PerformanceReport = {
  version: string;
  generatedAt: string;
  params: {
    days: number;
    minClosed: number;
    assets?: string[];
    timeframes: string[];
    labels: string[];
  };
  totals: {
    outcomesTotal: number;
    closedCount: number;
    openCount: number;
    tpCount: number;
    slCount: number;
    expiredCount: number;
    ambiguousCount: number;
    invalidCount: number;
    unknownCount: number;
    winrateTpSl: number | null;
    closeRate: number | null;
    statusCounts: StatusCounts;
  };
  buckets: Bucket[];
  insights?: {
    topWinrate?: Bucket[];
    bottomWinrate?: Bucket[];
    openHeavy?: Bucket[];
  };
  notes?: string[];
};

export type Filters = {
  timeframe?: string | null;
  playbookId?: string | null;
  hideLowSample: boolean;
};

export type AggregateRow = {
  key: { id: string; label: string; timeframe?: string; playbookId?: string };
  outcomesTotal: number;
  closedCount: number;
  openCount: number;
  tpCount: number;
  slCount: number;
  expiredCount: number;
  ambiguousCount: number;
  invalidCount: number;
  unknownCount: number;
  winrateTpSl: number | null;
  closeRate: number | null;
  flags: { tooFewClosed: boolean; mostlyOpen: boolean };
};

export async function loadPerformanceReport(): Promise<PerformanceReport | null> {
  const filePath = path.join(process.cwd(), "artifacts", "phase1", "swing-performance-breakdown-latest-v1.json");
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as PerformanceReport;
    if (!parsed?.buckets) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function filterBuckets(report: PerformanceReport, filters: Filters): Bucket[] {
  return report.buckets.filter((b) => {
    if (filters.timeframe && filters.timeframe !== "all") {
      if (b.key.timeframe.toLowerCase() !== filters.timeframe.toLowerCase()) return false;
    }
    if (filters.playbookId) {
      if (b.key.playbookId !== filters.playbookId) return false;
    }
    if (filters.hideLowSample && b.flags.tooFewClosed) return false;
    return true;
  });
}

export function aggregateByPlaybook(buckets: Bucket[]): AggregateRow[] {
  const map = new Map<string, AggregateRow>();
  for (const b of buckets) {
    const key = b.key.playbookId || "unknown";
    const existing = map.get(key);
    if (existing) {
      accumulate(existing, b);
    } else {
      map.set(key, createAggregateRow({ id: key, label: key, playbookId: key }, b));
    }
  }
  return Array.from(map.values()).sort((a, b) => b.closedCount - a.closedCount);
}

export function aggregateByAsset(buckets: Bucket[]): AggregateRow[] {
  const map = new Map<string, AggregateRow>();
  for (const b of buckets) {
    const key = `${b.key.assetId}|${b.key.timeframe}`;
    const label = `${b.key.assetId} (${b.key.timeframe})`;
    const existing = map.get(key);
    if (existing) {
      accumulate(existing, b);
    } else {
      map.set(key, createAggregateRow({ id: key, label, timeframe: b.key.timeframe, playbookId: b.key.playbookId }, b));
    }
  }
  return Array.from(map.values()).sort((a, b) => b.closedCount - a.closedCount);
}

function createAggregateRow(key: AggregateRow["key"], b: Bucket): AggregateRow {
  return {
    key,
    outcomesTotal: b.outcomesTotal,
    closedCount: b.closedCount,
    openCount: b.openCount,
    tpCount: b.tpCount,
    slCount: b.slCount,
    expiredCount: b.expiredCount,
    ambiguousCount: b.ambiguousCount,
    invalidCount: b.invalidCount,
    unknownCount: b.unknownCount,
    winrateTpSl: computeWinrate(b.tpCount, b.slCount),
    closeRate: computeRate(b.closedCount, b.outcomesTotal),
    flags: { ...b.flags },
  };
}

function accumulate(target: AggregateRow, b: Bucket): void {
  target.outcomesTotal += b.outcomesTotal;
  target.closedCount += b.closedCount;
  target.openCount += b.openCount;
  target.tpCount += b.tpCount;
  target.slCount += b.slCount;
  target.expiredCount += b.expiredCount;
  target.ambiguousCount += b.ambiguousCount;
  target.invalidCount += b.invalidCount;
  target.unknownCount += b.unknownCount;
  target.winrateTpSl = computeWinrate(target.tpCount, target.slCount);
  target.closeRate = computeRate(target.closedCount, target.outcomesTotal);
  target.flags.tooFewClosed = target.flags.tooFewClosed || b.flags.tooFewClosed;
  target.flags.mostlyOpen = target.flags.mostlyOpen || b.flags.mostlyOpen;
}

function computeWinrate(tp: number, sl: number): number | null {
  const denom = tp + sl;
  if (denom <= 0) return null;
  return tp / denom;
}

function computeRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function listPlaybooks(report: PerformanceReport): string[] {
  const set = new Set<string>();
  report.buckets.forEach((b) => {
    if (b.key.playbookId) set.add(b.key.playbookId);
  });
  return Array.from(set).sort();
}
