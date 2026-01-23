import { describe, expect, it } from "vitest";
import { JoinStatsSchema, OutcomeReport } from "@/src/app/[locale]/admin/(panel)/outcomes/diagnostics/schema";
import { computeMissingDims, computeMostlyOpenShare, computeStalenessMinutes } from "@/src/app/[locale]/admin/(panel)/outcomes/diagnostics/lib";

describe("Diagnostics parsing helpers", () => {
  it("parses join stats and computes missing dims", () => {
    const join = JoinStatsSchema.parse({
      generatedAt: "2026-01-01T00:00:00Z",
      overall: { setups: 10, outcomes: 9, matched: 9, unmatched: 0, joinRate: 1 },
      breakdowns: [{ assetId: "gold", timeframe: "1d", label: "eod", setups: 5, outcomes: 5, matched: 5, unmatched: 0, joinRate: 1 }],
    });
    expect(join.overall.joinRate).toBe(1);
  });

  it("computes missing dims and open share", () => {
    const report: OutcomeReport = {
      version: "v1",
      generatedAt: "2026-01-01T00:00:00Z",
      params: { days: 30, timeframes: ["1d"], labels: ["eod"] },
      overall: {
        outcomesTotal: 2,
        closedCount: 1,
        openCount: 1,
        tpCount: 1,
        slCount: 0,
        expiredCount: 0,
        ambiguousCount: 0,
        invalidCount: 0,
        unknownCount: 0,
      },
      byKey: [
        { key: { assetId: "wti", timeframe: "1d", label: "eod", playbookId: "energy", decision: "TRADE", grade: "A" }, outcomesTotal: 1, closedCount: 1, openCount: 0, tpCount: 1, slCount: 0, expiredCount: 0, ambiguousCount: 0, invalidCount: 0 },
        { key: { assetId: "wti", timeframe: "1d", label: "eod", playbookId: "unknown", decision: "unknown", grade: "UNKNOWN" }, outcomesTotal: 1, closedCount: 0, openCount: 1, tpCount: 0, slCount: 0, expiredCount: 0, ambiguousCount: 0, invalidCount: 0 },
      ],
    };
    const miss = computeMissingDims(report);
    expect(miss.missingPlaybook).toBe(1);
    expect(computeMostlyOpenShare(report)).toBeCloseTo(0.5);
  });

  it("handles staleness", () => {
    const minutes = computeStalenessMinutes("2026-01-01T00:00:00Z");
    expect(minutes).not.toBeNull();
  });
});
