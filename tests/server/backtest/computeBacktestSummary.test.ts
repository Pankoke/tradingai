import { describe, expect, it } from "vitest";
import { computeBacktestSummary } from "@/src/server/backtest/runBacktest";
import type { BacktestStepResult } from "@/src/server/backtest/runBacktest";

describe("computeBacktestSummary", () => {
  it("aggregates decisions, grades, averages and min/max", () => {
    const steps: BacktestStepResult[] = [
      { asOfIso: "t1", topSetup: { id: "a", decision: "buy", grade: "A", scoreTotal: 80, confidence: 90 }, setups: 2 },
      { asOfIso: "t2", topSetup: { id: "b", decision: "sell", grade: "B", scoreTotal: 60, confidence: 70 }, setups: 1 },
      { asOfIso: "t3", topSetup: { id: "c", decision: "buy", grade: "A", scoreTotal: 40, confidence: 60 }, setups: 1 },
      { asOfIso: "t4", topSetup: null },
      { asOfIso: "t5" },
      { asOfIso: "t6", topSetup: { id: "d", decision: "hold", grade: "C", scoreTotal: 50 } },
    ];

    const summary = computeBacktestSummary(steps);

    expect(summary.totalSteps).toBe(6);
    expect(summary.stepsWithTopSetup).toBe(4);
    expect(summary.decisionCounts.buy).toBe(2);
    expect(summary.decisionCounts.sell).toBe(1);
    expect(summary.decisionCounts.hold).toBe(1);
    expect(summary.gradeCounts.A).toBe(2);
    expect(summary.gradeCounts.B).toBe(1);
    expect(summary.gradeCounts.C).toBe(1);
    expect(summary.avgScoreTotal).toBeCloseTo((80 + 60 + 40 + 50) / 4);
    expect(summary.minScoreTotal).toBe(40);
    expect(summary.maxScoreTotal).toBe(80);
    expect(summary.avgConfidence).toBeCloseTo((90 + 70 + 60) / 3);
  });
});
