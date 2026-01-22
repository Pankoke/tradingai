import { describe, expect, it } from "vitest";
import type { ByKey, Report } from "../../scripts/phase1/swing-outcome-analysis";
import {
  renderMarkdown,
} from "../../scripts/phase1/swing-outcome-analysis";

function makeReport(): Report {
  const byKey: ByKey[] = [
    {
      key: {
        assetId: "eurusd",
        timeframe: "1d",
        label: "eod",
        playbookId: "eurusd-swing-v0.1",
        decision: "watch",
        grade: "no_trade",
        alignment: "long",
      },
      outcomesTotal: 5,
      tpCount: 3,
      slCount: 2,
      closedCount: 5,
      expiredCount: 0,
      ambiguousCount: 0,
      invalidCount: 0,
      winrate: 0.6,
      winrateDefinition: "tp/(tp+sl)",
      topReasons: [{ reason: "watch bias", count: 3 }],
      topSegments: [{ segment: "watch_fails_bias", count: 3 }],
    },
  ];

  const report: Report = {
    version: "v1",
    generatedAt: "2026-01-21T00:00:00.000Z",
    params: {
      days: 30,
      assets: ["eurusd"],
      timeframes: ["1d"],
      labels: ["eod"],
      allowDerivedPlaybookFallback: false,
    },
    availability: {
      playbookId: true,
      decision: true,
      grade: true,
      alignment: true,
      reasons: true,
      segments: true,
      outcomeStatus: true,
      tpSl: true,
    },
    overall: {
      outcomesTotal: 5,
      closedCount: 5,
      openCount: 0,
      tpCount: 3,
      slCount: 2,
      expiredCount: 0,
      ambiguousCount: 0,
      invalidCount: 0,
      unknownCount: 0,
      winrateTpSl: 0.6,
      winrate: 0.6,
      winrateDefinition: "tp/(tp+sl)",
      closeRate: 1,
      statusCounts: { TP: 3, SL: 2 },
    },
    byKey,
    notes: [],
    samples: { matchedSampleIds: ["o1"] },
    dimensionSourceCounts: {
      playbookId: { persisted: 5, derived: 0, missing: 0 },
      decision: { persisted: 5, derived: 0, missing: 0 },
      grade: { persisted: 5, derived: 0, missing: 0 },
    },
    fallbackUsedCount: 0,
    allowDerivedPlaybookFallback: false,
  };
  return report;
}

describe("swing outcome analysis report", () => {
  it("renders markdown table", () => {
    const report = makeReport();
    const md = renderMarkdown(report);
    expect(md).toContain("Swing Outcome Analysis");
    expect(md).toContain("| eurusd | 1d | eod | eurusd-swing-v0.1");
    expect(md).toContain("winrate");
  });
});
