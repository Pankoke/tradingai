import { describe, expect, it } from "vitest";
import type { KeyStats } from "../../scripts/phase1/join-stats";
import {
  buildReportPayload,
  renderMarkdownReport,
} from "../../scripts/phase1/join-stats";

describe("join-stats payload formatting", () => {
  const params = {
    days: 30,
    assets: undefined as Set<string> | undefined,
    timeframes: new Set(["1d", "1w"]),
    labels: new Set(["eod", "(null)"]),
  };

  const keyStats: KeyStats[] = [
    {
      key: { assetId: "eurusd", timeframe: "1d", label: "eod" },
      setupsTotal: 10,
      snapshotsTotal: 10,
      outcomesTotal: 9,
      matchedOutcomes: 9,
      unmatchedOutcomes: 0,
      joinRate: 1,
    },
    {
      key: { assetId: "gbpusd", timeframe: "1d", label: "(null)" },
      setupsTotal: 5,
      snapshotsTotal: 5,
      outcomesTotal: 4,
      matchedOutcomes: 3,
      unmatchedOutcomes: 1,
      joinRate: 0.75,
    },
  ];

  it("builds payload with overall joinRate", () => {
    const payload = buildReportPayload(params, keyStats, [], []);
    expect(payload.overall.setupsTotal).toBe(15);
    expect(payload.overall.outcomesTotal).toBe(13);
    expect(payload.overall.matchedOutcomes).toBe(12);
    expect(payload.overall.unmatchedOutcomes).toBe(1);
    expect(payload.overall.joinRate).toBeCloseTo(12 / 13);
    expect(payload.byKey).toHaveLength(2);
    expect(payload.version).toBe("v1");
  });

  it("renders markdown with tables", () => {
    const payload = buildReportPayload(params, keyStats, [], []);
    const md = renderMarkdownReport(payload);
    expect(md).toContain("Phase-1 Join Stats");
    expect(md).toContain("| eurusd | 1d | eod |");
    expect(md).toContain("Unmatched Outcome Samples");
  });
});
