import { describe, expect, it } from "vitest";
import { aggregateWeeklyFromDaily } from "@/src/features/marketData/syncDailyCandles";

function daily(ts: string, open: number, high: number, low: number, close: number, volume = 1) {
  return {
    assetId: "a",
    timeframe: "1D",
    timestamp: new Date(ts),
    open,
    high,
    low,
    close,
    volume,
    source: "test",
  };
}

describe("aggregateWeeklyFromDaily", () => {
  it("aggregates a full week of daily candles", () => {
    const weekly = aggregateWeeklyFromDaily([
      daily("2025-01-06T00:00:00Z", 10, 12, 9, 11, 100),
      daily("2025-01-07T00:00:00Z", 11, 13, 10, 12, 110),
      daily("2025-01-08T00:00:00Z", 12, 14, 11, 13, 120),
      daily("2025-01-09T00:00:00Z", 13, 15, 12, 14, 130),
      daily("2025-01-10T00:00:00Z", 14, 16, 13, 15, 140),
    ]);
    expect(weekly).toHaveLength(1);
    const w = weekly[0];
    expect(w.open).toBe(10);
    expect(w.close).toBe(15);
    expect(w.high).toBe(16);
    expect(w.low).toBe(9);
    expect(w.volume).toBe(100 + 110 + 120 + 130 + 140);
    expect(w.timestamp.toISOString().startsWith("2025-01-06")).toBe(true); // week start
  });

  it("splits across week boundaries", () => {
    const weekly = aggregateWeeklyFromDaily([
      daily("2025-01-03T00:00:00Z", 10, 11, 9, 10.5, 50), // prev week
      daily("2025-01-06T00:00:00Z", 11, 12, 10, 11.5, 60), // new week start
    ]);
    expect(weekly).toHaveLength(2);
    const first = weekly.find((c) => c.timestamp.toISOString().startsWith("2024-12-30"))!;
    const second = weekly.find((c) => c.timestamp.toISOString().startsWith("2025-01-06"))!;
    expect(first.open).toBe(10);
    expect(first.close).toBe(10.5);
    expect(second.open).toBe(11);
    expect(second.close).toBe(11.5);
  });

  it("includes partial current week and keeps stable timestamp", () => {
    const weekly = aggregateWeeklyFromDaily([
      daily("2025-01-06T00:00:00Z", 10, 12, 9, 11, 100),
      daily("2025-01-07T00:00:00Z", 11, 13, 10, 12, 110),
    ]);
    expect(weekly).toHaveLength(1);
    const w = weekly[0];
    expect(w.timestamp.toISOString().startsWith("2025-01-06")).toBe(true);
    expect(w.open).toBe(10);
    expect(w.close).toBe(12);
    expect(w.high).toBe(13);
    expect(w.low).toBe(9);
    expect(w.volume).toBe(210);
  });
});
