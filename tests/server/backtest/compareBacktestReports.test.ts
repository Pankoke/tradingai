import { describe, expect, it, vi, beforeEach } from "vitest";
import path from "path";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import type { BacktestReport } from "@/src/server/backtest/runBacktest";
import { compareBacktestReports } from "@/src/server/backtest/compareBacktestReports";

const baseReport: BacktestReport = {
  assetId: "BTC",
  fromIso: "2026-01-01T00:00:00.000Z",
  toIso: "2026-01-02T00:00:00.000Z",
  stepHours: 4,
  lookbackHours: 24,
  steps: [
    {
      asOfIso: "2026-01-01T00:00:00.000Z",
      score: 80,
      topSetup: { id: "s1", decision: "buy", decisionSource: "engine", grade: "A", gradeSource: "engine", scoreTotal: 80 },
    },
    {
      asOfIso: "2026-01-01T04:00:00.000Z",
      score: 60,
      topSetup: { id: "s2", decision: "sell", decisionSource: "engine", grade: "B", gradeSource: "engine", scoreTotal: 60 },
    },
  ],
  summary: {
    totalSteps: 2,
    stepsWithTopSetup: 2,
    decisionCounts: { buy: 1, sell: 1 },
    gradeCounts: { A: 1, B: 1 },
    avgScoreTotal: 70,
    avgConfidence: null,
    minScoreTotal: 60,
    maxScoreTotal: 80,
  },
};

describe("compareBacktestReports", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "bt-compare-"));
  });

  it("detects summary deltas and differing steps", async () => {
    const left = { ...baseReport };
    const right: BacktestReport = {
      ...baseReport,
      steps: [
        {
          asOfIso: "2026-01-01T00:00:00.000Z",
          score: 82,
          topSetup: {
            id: "s1",
            decision: "buy",
            decisionSource: "engine",
            grade: "A",
            gradeSource: "engine",
            scoreTotal: 82,
          },
        },
        {
          asOfIso: "2026-01-01T04:00:00.000Z",
          score: 55,
          topSetup: {
            id: "s2",
            decision: "no-trade",
            decisionSource: "engine",
            grade: "B",
            gradeSource: "engine",
            scoreTotal: 55,
          },
        },
      ],
      summary: {
        ...baseReport.summary,
        decisionCounts: { buy: 1, "no-trade": 1 },
        gradeCounts: { A: 1, B: 1 },
        avgScoreTotal: 68.5,
        minScoreTotal: 55,
        maxScoreTotal: 82,
      },
    };

    const leftPath = path.join(tmpDir, "left.json");
    const rightPath = path.join(tmpDir, "right.json");
    await writeFile(leftPath, JSON.stringify(left), "utf8");
    await writeFile(rightPath, JSON.stringify(right), "utf8");

    const result = await compareBacktestReports(leftPath, rightPath, 5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { diff } = result;
    expect(diff.summaryDelta.avgScoreTotalDelta).toBeCloseTo(-1.5);
    expect(diff.summaryDelta.minScoreTotalDelta).toBeCloseTo(-5);
    expect(diff.summaryDelta.maxScoreTotalDelta).toBeCloseTo(2);
    expect(diff.summaryDelta.decisionCountsDelta.buy).toBe(0);
    expect(diff.summaryDelta.decisionCountsDelta["no-trade"]).toBe(1);
    expect(diff.stepDelta.differingSteps).toBe(2);
    expect(diff.stepDelta.differingAsOfIso).toContain("2026-01-01T00:00:00.000Z");
  });

  it("fails on mismatching metadata", async () => {
    const otherAsset = { ...baseReport, assetId: "ETH" };
    const leftPath = path.join(tmpDir, "left.json");
    const rightPath = path.join(tmpDir, "right.json");
    await writeFile(leftPath, JSON.stringify(baseReport), "utf8");
    await writeFile(rightPath, JSON.stringify(otherAsset), "utf8");
    const result = await compareBacktestReports(leftPath, rightPath);
    expect(result.ok).toBe(false);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });
});
