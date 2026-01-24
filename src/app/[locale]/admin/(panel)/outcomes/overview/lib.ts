import type { OutcomeReport } from "../../playbooks/schema";

export type OverviewFilters = {
  timeframe: string;
  label: string;
  minClosed: number;
  includeOpenOnly: boolean;
};

export type Totals = {
  outcomesTotal: number;
  closed: number;
  open: number;
  tp: number;
  sl: number;
  winrateClosed: number | null;
  closeRate: number | null;
};

export type BucketRow = {
  id: string;
  outcomesTotal: number;
  closed: number;
  open: number;
  tp: number;
  sl: number;
  winrateClosed: number | null;
  closeRate: number | null;
  flags: string[];
};

export type DecisionRow = {
  decision: string;
  outcomesTotal: number;
  closed: number;
  open: number;
};

export type Integrity = {
  fallbackUsedCount: number | null;
  missingPlaybook: number;
  missingDecision: number;
  missingGrade: number;
};

export type PlaybookCoverage = {
  observed: string[];
  missing: string[];
  unexpected: string[];
};

export function filterRows(report: OutcomeReport, filters: OverviewFilters) {
  return report.byKey.filter((row) => {
    if (filters.timeframe !== "all" && row.key.timeframe.toLowerCase() !== filters.timeframe) return false;
    if (filters.label !== "all" && row.key.label.toLowerCase() !== filters.label) return false;
    return true;
  });
}

export function computeTotals(rows: OutcomeReport["byKey"]): Totals {
  const acc = { outcomesTotal: 0, closed: 0, open: 0, tp: 0, sl: 0 };
  for (const row of rows) {
    acc.outcomesTotal += row.outcomesTotal;
    acc.closed += row.closedCount;
    acc.open += row.openCount;
    acc.tp += row.tpCount;
    acc.sl += row.slCount;
  }
  const denom = acc.tp + acc.sl;
  const winrateClosed = denom > 0 ? acc.tp / denom : null;
  const closeRate = acc.outcomesTotal > 0 ? acc.closed / acc.outcomesTotal : null;
  return { ...acc, winrateClosed, closeRate };
}

function buildBucket(
  map: Map<string, BucketRow>,
  id: string,
  row: OutcomeReport["byKey"][number],
  filters: OverviewFilters,
) {
  const current = map.get(id) ?? {
    id,
    outcomesTotal: 0,
    closed: 0,
    open: 0,
    tp: 0,
    sl: 0,
    winrateClosed: null as number | null,
    closeRate: null as number | null,
    flags: [] as string[],
  };
  current.outcomesTotal += row.outcomesTotal;
  current.closed += row.closedCount;
  current.open += row.openCount;
  current.tp += row.tpCount;
  current.sl += row.slCount;
  const denom = current.tp + current.sl;
  current.winrateClosed = denom > 0 ? current.tp / denom : null;
  current.closeRate = current.outcomesTotal > 0 ? current.closed / current.outcomesTotal : null;
  current.flags = current.flags.filter(Boolean);
  if (!filters.includeOpenOnly && current.closed < filters.minClosed) {
    if (!current.flags.includes("low-sample")) current.flags.push("low-sample");
  }
  if (current.closeRate !== null && current.closeRate < 0.2) {
    if (!current.flags.includes("mostly-open")) current.flags.push("mostly-open");
  }
  map.set(id, current);
}

export function aggregatePlaybooks(rows: OutcomeReport["byKey"], filters: OverviewFilters): BucketRow[] {
  const map = new Map<string, BucketRow>();
  for (const row of rows) {
    const id = row.key.playbookId || "unknown";
    buildBucket(map, id, row, filters);
  }
  return Array.from(map.values())
    .filter((r) => filters.includeOpenOnly || r.closed >= filters.minClosed || r.flags.includes("mostly-open"))
    .sort((a, b) => b.closed - a.closed || b.outcomesTotal - a.outcomesTotal);
}

export function aggregateAssets(rows: OutcomeReport["byKey"], filters: OverviewFilters): BucketRow[] {
  const map = new Map<string, BucketRow>();
  for (const row of rows) {
    const id = `${row.key.assetId}-${row.key.timeframe}`;
    buildBucket(map, id, row, filters);
  }
  return Array.from(map.values())
    .filter((r) => filters.includeOpenOnly || r.closed >= filters.minClosed || r.flags.includes("mostly-open"))
    .sort((a, b) => b.closed - a.closed || b.outcomesTotal - a.outcomesTotal);
}

export function aggregateDecisions(rows: OutcomeReport["byKey"]): DecisionRow[] {
  const map = new Map<string, DecisionRow>();
  for (const row of rows) {
    const key = row.key.decision ?? "unknown";
    const current = map.get(key) ?? { decision: key, outcomesTotal: 0, closed: 0, open: 0 };
    current.outcomesTotal += row.outcomesTotal;
    current.closed += row.closedCount;
    current.open += row.openCount;
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => b.outcomesTotal - a.outcomesTotal);
}

export function computeIntegrity(rows: OutcomeReport["byKey"], fallbackUsedCount: number | null): Integrity {
  let missingPlaybook = 0;
  let missingDecision = 0;
  let missingGrade = 0;
  for (const row of rows) {
    if (!row.key.playbookId || row.key.playbookId === "unknown") missingPlaybook += row.outcomesTotal;
    if (!row.key.decision || row.key.decision === "unknown") missingDecision += row.outcomesTotal;
    if (!row.key.grade || row.key.grade === "UNKNOWN") missingGrade += row.outcomesTotal;
  }
  return { fallbackUsedCount, missingPlaybook, missingDecision, missingGrade };
}

export function diffPlaybooks(expected: string[], observed: string[]): PlaybookCoverage {
  const expSet = new Set(expected);
  const obsSet = new Set(observed);
  const observedSorted = Array.from(obsSet).sort();
  const missing = expected.filter((id) => !obsSet.has(id)).sort();
  const unexpected = observedSorted.filter((id) => !expSet.has(id));
  return { observed: observedSorted, missing, unexpected };
}
