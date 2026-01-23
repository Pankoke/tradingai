import { describe, expect, it } from "vitest";
import type { OutcomeReport } from "@/src/app/[locale]/admin/(panel)/playbooks/schema";
import {
  aggregateAssets,
  aggregateDecisions,
  aggregatePlaybooks,
  computeTotals,
  filterRows,
} from "@/src/app/[locale]/admin/(panel)/outcomes/overview/lib";

const sample: OutcomeReport = {
  version: "v1",
  generatedAt: "2026-01-01T00:00:00Z",
  params: { days: 30, timeframes: ["1d"], labels: ["eod"] },
  overall: {
    outcomesTotal: 3,
    closedCount: 3,
    openCount: 0,
    tpCount: 2,
    slCount: 1,
    expiredCount: 0,
    ambiguousCount: 0,
    invalidCount: 0,
    unknownCount: 0,
    winrateDefinition: "tp/(tp+sl)",
    closeRate: 1,
  },
  byKey: [
    {
      key: { assetId: "gold", timeframe: "1d", label: "eod", playbookId: "gold-swing-v0.2", decision: "TRADE", grade: "A" },
      outcomesTotal: 1,
      closedCount: 1,
      openCount: 0,
      tpCount: 1,
      slCount: 0,
      expiredCount: 0,
      ambiguousCount: 0,
      invalidCount: 0,
      unknownCount: 0,
    },
    {
      key: { assetId: "wti", timeframe: "1d", label: "eod", playbookId: "energy-swing-v0.1", decision: "TRADE", grade: "B" },
      outcomesTotal: 1,
      closedCount: 1,
      openCount: 0,
      tpCount: 0,
      slCount: 1,
      expiredCount: 0,
      ambiguousCount: 0,
      invalidCount: 0,
      unknownCount: 0,
    },
    {
      key: { assetId: "wti", timeframe: "1d", label: "eod", playbookId: "energy-swing-v0.1", decision: "WATCH", grade: "NO_TRADE" },
      outcomesTotal: 1,
      closedCount: 0,
      openCount: 1,
      tpCount: 0,
      slCount: 0,
      expiredCount: 0,
      ambiguousCount: 0,
      invalidCount: 0,
      unknownCount: 0,
    },
  ],
};

describe("Outcomes overview aggregation", () => {
  it("computes totals and buckets", () => {
    const rows = filterRows(sample, { timeframe: "all", label: "all", minClosed: 1, includeOpenOnly: false });
    const totals = computeTotals(rows);
    expect(totals.outcomesTotal).toBe(3);
    expect(totals.closed).toBe(2);
    expect(totals.open).toBe(1);
    expect(totals.winrateClosed).toBeCloseTo(0.5);
    expect(totals.closeRate).toBeCloseTo(2 / 3);

    const playbooks = aggregatePlaybooks(rows, { timeframe: "all", label: "all", minClosed: 1, includeOpenOnly: false });
    const energy = playbooks.find((p) => p.id === "energy-swing-v0.1");
    expect(energy?.closed).toBe(1);
    expect(energy?.open).toBe(1);

    const assets = aggregateAssets(rows, { timeframe: "all", label: "all", minClosed: 1, includeOpenOnly: false });
    expect(assets[0]?.id).toBe("wti-1d");

    const decisions = aggregateDecisions(rows);
    expect(decisions.find((d) => d.decision === "WATCH")?.outcomesTotal).toBe(1);
  });
});
