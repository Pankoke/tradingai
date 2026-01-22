import { describe, expect, it } from "vitest";
import type { Report } from "../../scripts/phase1/swing-performance-breakdown";
import { mapOutcomeStatus } from "../../scripts/phase1/swing-performance-breakdown";

function makeBucket(overrides: Partial<Report["buckets"][number]> = {}): Report["buckets"][number] {
  return {
    key: {
      assetId: "eurusd",
      timeframe: "1d",
      label: "eod",
      playbookId: "eurusd-swing-v0.1",
      grade: "no_trade",
      decisionBucket: "watch",
    },
    outcomesTotal: 30,
    closedCount: 25,
    openCount: 5,
    tpCount: 10,
    slCount: 5,
    expiredCount: 3,
    ambiguousCount: 1,
    invalidCount: 6,
    unknownCount: 5,
    winrateTpSl: 0.6667,
    closeRate: 0.8333,
    flags: { tooFewClosed: false, mostlyOpen: false },
    statusCounts: { TP: 10, SL: 5, EXPIRED: 3, AMBIGUOUS: 1, INVALID: 6, OPEN: 5, UNKNOWN: 0 },
    ...overrides,
  };
}

function makeReport(): Report {
  return {
    version: "v1",
    generatedAt: "2026-01-22T00:00:00.000Z",
    params: {
      days: 30,
      minClosed: 20,
      timeframes: ["1d"],
      labels: ["eod"],
      assets: ["eurusd"],
    },
    totals: {
      outcomesTotal: 30,
      closedCount: 25,
      openCount: 5,
      tpCount: 10,
      slCount: 5,
      expiredCount: 3,
      ambiguousCount: 1,
      invalidCount: 6,
      unknownCount: 5,
      winrateTpSl: 0.6667,
      closeRate: 0.8333,
      statusCounts: { TP: 10, SL: 5, EXPIRED: 3, AMBIGUOUS: 1, INVALID: 6, OPEN: 5, UNKNOWN: 0 },
    },
    buckets: [makeBucket()],
    insights: {
      topWinrate: [makeBucket({ key: { ...makeBucket().key, decisionBucket: "trade" } })],
      bottomWinrate: [],
      openHeavy: [],
    },
    notes: [],
  };
}

describe("swing performance breakdown", () => {
  it("schema sanity", () => {
    const report = makeReport();
    expect(report.version).toBe("v1");
    expect(report.buckets[0].key.assetId).toBe("eurusd");
    expect(report.buckets[0].winrateTpSl).toBeCloseTo(0.6667, 4);
    expect(report.totals.statusCounts.TP).toBe(10);
  });

  it("maps outcome status", () => {
    expect(mapOutcomeStatus("hit_tp")).toBe("TP");
    expect(mapOutcomeStatus("hit_sl")).toBe("SL");
    expect(mapOutcomeStatus("expired")).toBe("EXPIRED");
    expect(mapOutcomeStatus("ambiguous")).toBe("AMBIGUOUS");
    expect(mapOutcomeStatus("invalid")).toBe("INVALID");
    expect(mapOutcomeStatus("open")).toBe("OPEN");
    expect(mapOutcomeStatus("unknown_status")).toBe("UNKNOWN");
  });
}
*** End Patch
