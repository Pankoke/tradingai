import path from "node:path";
import { OutcomeReportSchema, type OutcomeReport } from "./schema";
import { buildPhase1Candidates, loadPhase1Artifact } from "@/lib/artifacts/storage";

export type PlaybookAggregate = {
  playbookId: string;
  outcomesTotal: number;
  closedCount: number;
  openCount: number;
  tpCount: number;
  slCount: number;
  winrate: number | null;
  closeRate: number | null;
  flags: string[];
};

export type AggregateFilters = {
  timeframe: string;
  label: string;
  minClosed: number;
  includeOpenOnly: boolean;
};

export async function loadLatestOutcomeReport(): Promise<OutcomeReport | null> {
  const candidates = buildPhase1Candidates("swing-outcome-analysis");
  const loaded = await loadPhase1Artifact(candidates, (value) => OutcomeReportSchema.parse(normalizeOpenCounts(value)));
  return loaded?.data ?? null;
}

function normalizeOpenCounts(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const clone = structuredClone(value) as any;
  if (clone.overall && typeof clone.overall.openCount !== "number" && typeof clone.overall.closedCount === "number" && typeof clone.overall.outcomesTotal === "number") {
    clone.overall.openCount = clone.overall.outcomesTotal - clone.overall.closedCount;
  }
  if (Array.isArray(clone.byKey)) {
    clone.byKey = clone.byKey.map((row: any) => {
      if (
        row &&
        typeof row === "object" &&
        typeof row.openCount !== "number" &&
        typeof row.closedCount === "number" &&
        typeof row.outcomesTotal === "number"
      ) {
        return { ...row, openCount: row.outcomesTotal - row.closedCount };
      }
      return row;
    });
  }
  return clone;
}

export function aggregatePlaybooks(report: OutcomeReport, filters: AggregateFilters): PlaybookAggregate[] {
  const rows = report.byKey.filter((row) => {
    if (filters.timeframe !== "all" && row.key.timeframe.toLowerCase() !== filters.timeframe) return false;
    if (filters.label !== "all" && row.key.label.toLowerCase() !== filters.label) return false;
    return true;
  });

  const map = new Map<string, PlaybookAggregate>();
  for (const row of rows) {
    const id = row.key.playbookId || "unknown";
    const current = map.get(id) ?? {
      playbookId: id,
      outcomesTotal: 0,
      closedCount: 0,
      openCount: 0,
      tpCount: 0,
      slCount: 0,
      winrate: null as number | null,
      closeRate: null as number | null,
      flags: [] as string[],
    };
    current.outcomesTotal += row.outcomesTotal;
    current.closedCount += row.closedCount;
    current.openCount += row.openCount;
    current.tpCount += row.tpCount;
    current.slCount += row.slCount;
    map.set(id, current);
  }

  const result: PlaybookAggregate[] = [];
  for (const [, value] of map) {
    const denom = value.tpCount + value.slCount;
    value.winrate = denom > 0 ? value.tpCount / denom : null;
    value.closeRate = value.outcomesTotal > 0 ? value.closedCount / value.outcomesTotal : null;
    if (!filters.includeOpenOnly && value.closedCount < filters.minClosed) {
      value.flags.push("low-sample");
    }
    if (value.closeRate !== null && value.closeRate < 0.2) {
      value.flags.push("mostly-open");
    }
    if (filters.includeOpenOnly || value.closedCount >= filters.minClosed || value.flags.includes("mostly-open")) {
      result.push(value);
    }
  }

  return result.sort((a, b) => b.closedCount - a.closedCount || b.outcomesTotal - a.outcomesTotal);
}
