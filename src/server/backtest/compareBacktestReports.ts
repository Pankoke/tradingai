import { readFile } from "node:fs/promises";
import path from "path";
import type { BacktestReport } from "./runBacktest";

export type BacktestReportDiff = {
  leftPath: string;
  rightPath: string;
  summaryDelta: {
    avgScoreTotalDelta: number | null;
    avgConfidenceDelta: number | null;
    minScoreTotalDelta: number | null;
    maxScoreTotalDelta: number | null;
    gradeCountsDelta: Record<string, number>;
    decisionCountsDelta: Record<string, number>;
  };
  stepDelta: {
    totalStepsCompared: number;
    differingSteps: number;
    differingAsOfIso: string[];
  };
};

function computeCountsDelta(
  left: Record<string, number>,
  right: Record<string, number>,
): Record<string, number> {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const result: Record<string, number> = {};
  for (const key of keys) {
    result[key] = (right[key] ?? 0) - (left[key] ?? 0);
  }
  return result;
}

function numericDelta(right: number | null, left: number | null): number | null {
  if (typeof right === "number" && typeof left === "number") return right - left;
  return null;
}

function stepsDiffer(left: BacktestReport["steps"][number], right: BacktestReport["steps"][number]): boolean {
  return (
    left.topSetup?.decision !== right.topSetup?.decision ||
    left.topSetup?.grade !== right.topSetup?.grade ||
    left.topSetup?.scoreTotal !== right.topSetup?.scoreTotal
  );
}

export async function compareBacktestReports(
  leftPath: string,
  rightPath: string,
  maxStepEntries = 20,
): Promise<{ ok: true; diff: BacktestReportDiff } | { ok: false; error: string }> {
  try {
    const [leftRaw, rightRaw] = await Promise.all([
      readFile(path.resolve(leftPath), "utf8"),
      readFile(path.resolve(rightPath), "utf8"),
    ]);
    const left = JSON.parse(leftRaw) as BacktestReport;
    const right = JSON.parse(rightRaw) as BacktestReport;

    if (left.assetId !== right.assetId) return { ok: false, error: "assetId mismatch" };
    if (left.stepHours !== right.stepHours) return { ok: false, error: "stepHours mismatch" };
    if (left.lookbackHours !== right.lookbackHours) return { ok: false, error: "lookbackHours mismatch" };

    const totalStepsCompared = Math.min(left.steps.length, right.steps.length);
    let differingSteps = 0;
    const differingAsOfIso: string[] = [];

    for (let i = 0; i < totalStepsCompared; i += 1) {
      if (stepsDiffer(left.steps[i], right.steps[i])) {
        differingSteps += 1;
        if (differingAsOfIso.length < maxStepEntries) {
          differingAsOfIso.push(left.steps[i].asOfIso ?? `index:${i}`);
        }
      }
    }

    const summaryDelta = {
      avgScoreTotalDelta: numericDelta(right.summary.avgScoreTotal, left.summary.avgScoreTotal),
      avgConfidenceDelta: numericDelta(right.summary.avgConfidence, left.summary.avgConfidence),
      minScoreTotalDelta: numericDelta(right.summary.minScoreTotal, left.summary.minScoreTotal),
      maxScoreTotalDelta: numericDelta(right.summary.maxScoreTotal, left.summary.maxScoreTotal),
      gradeCountsDelta: computeCountsDelta(left.summary.gradeCounts, right.summary.gradeCounts),
      decisionCountsDelta: computeCountsDelta(left.summary.decisionCounts, right.summary.decisionCounts),
    };

    return {
      ok: true,
      diff: {
        leftPath: path.resolve(leftPath),
        rightPath: path.resolve(rightPath),
        summaryDelta,
        stepDelta: { totalStepsCompared, differingSteps, differingAsOfIso },
      },
    };
  } catch (error) {
    return { ok: false, error: `compare_failed: ${String(error)}` };
  }
}
