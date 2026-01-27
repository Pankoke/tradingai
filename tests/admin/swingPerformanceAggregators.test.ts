import { describe, expect, it } from "vitest";
import {
  aggregateByAsset,
  aggregateByPlaybook,
  filterBuckets,
  type Bucket,
  type PerformanceReport,
} from "@/src/app/[locale]/admin/(panel)/outcomes/swing-performance/utils";

const sampleReport: PerformanceReport = {
  version: "v1",
  generatedAt: "2026-01-01T00:00:00Z",
  params: { days: 30, minClosed: 20, timeframes: ["1d"], labels: ["eod"] },
  totals: {
    outcomesTotal: 4,
    closedCount: 4,
    openCount: 0,
    tpCount: 2,
    slCount: 2,
    expiredCount: 0,
    ambiguousCount: 0,
    invalidCount: 0,
    unknownCount: 0,
    winrateTpSl: 0.5,
    closeRate: 1,
    statusCounts: { TP: 2, SL: 2, EXPIRED: 0, AMBIGUOUS: 0, INVALID: 0, OPEN: 0, UNKNOWN: 0 },
  },
  buckets: [
    buildBucket("gold-swing-v0.2", "gold", "1d", 1, 1),
    buildBucket("energy-swing-v0.1", "wti", "1d", 1, 0),
    buildBucket("energy-swing-v0.1", "wti", "1d", 0, 1),
  ],
  insights: {},
  notes: [],
};

function buildBucket(playbookId: string, assetId: string, timeframe: string, tp: number, sl: number): Bucket {
  const total = tp + sl;
  return {
    key: { assetId, timeframe, label: "eod", playbookId, grade: "A", decisionBucket: "TRADE" },
    outcomesTotal: total,
    closedCount: total,
    openCount: 0,
    tpCount: tp,
    slCount: sl,
    expiredCount: 0,
    ambiguousCount: 0,
    invalidCount: 0,
    unknownCount: 0,
    winrateTpSl: tp + sl > 0 ? tp / (tp + sl) : null,
    closeRate: 1,
    flags: { tooFewClosed: false, mostlyOpen: false },
    statusCounts: { TP: tp, SL: sl, EXPIRED: 0, AMBIGUOUS: 0, INVALID: 0, OPEN: 0, UNKNOWN: 0 },
  };
}

describe("swing performance aggregators", () => {
  it("aggregates by playbook with filters", () => {
    const buckets = filterBuckets(sampleReport, { timeframe: "1d", playbookId: "", hideLowSample: true });
    const byPlaybook = aggregateByPlaybook(buckets);
    const energy = byPlaybook.find((r) => r.key.id === "energy-swing-v0.1");
    const gold = byPlaybook.find((r) => r.key.id === "gold-swing-v0.2");
    expect(energy?.closedCount).toBe(2);
    expect(energy?.tpCount).toBe(1);
    expect(energy?.slCount).toBe(1);
    expect(energy?.winrateTpSl).toBe(0.5);
    expect(gold?.closedCount).toBe(2);
  });

  it("aggregates by asset", () => {
    const buckets = filterBuckets(sampleReport, { timeframe: "all", playbookId: "", hideLowSample: true });
    const byAsset = aggregateByAsset(buckets);
    const wti = byAsset.find((r) => r.key.label.startsWith("wti"));
    expect(wti?.closedCount).toBe(2);
    expect(wti?.tpCount).toBe(1);
    expect(wti?.slCount).toBe(1);
  });
});
