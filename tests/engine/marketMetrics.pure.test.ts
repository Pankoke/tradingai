import { describe, expect, it } from "vitest";
import { buildMarketMetrics, type CandleLike } from "@/src/lib/engine/marketMetrics";

describe("buildMarketMetrics", () => {
  it("uses provided asOf for freshness and computes deterministic metrics", async () => {
    const asOf = new Date("2024-01-02T00:00:00Z");
    const daily: CandleLike[] = [
      { timestamp: new Date("2023-12-30T00:00:00Z"), open: 100, high: 110, low: 95, close: 105 },
    ];
    const hourly: CandleLike[] = [
      { timestamp: new Date("2024-01-01T22:00:00Z"), open: 100, high: 101, low: 99, close: 100 },
      { timestamp: new Date("2024-01-01T21:00:00Z"), open: 99, high: 100, low: 98, close: 99 },
    ];

    const metrics = await buildMarketMetrics({
      candlesByTimeframe: { "1D": daily, "1H": hourly },
      referencePrice: 100,
      timeframes: ["1D", "1H"],
      now: asOf,
    });

    expect(metrics.evaluatedAt).toBe(asOf.toISOString());
    expect(metrics.lastPrice).toBe(100);
    expect(metrics.priceDriftPct).toBeCloseTo(0);
    expect(metrics.isStale).toBe(true);
    expect(metrics.reasons.some((reason) => reason.includes("Daily candle outdated"))).toBe(true);
  });

  it("treats swing price drift up to 8% as non-stale", async () => {
    const asOf = new Date("2024-01-02T00:00:00Z");
    const daily: CandleLike[] = [
      { timestamp: new Date("2024-01-01T00:00:00Z"), open: 100, high: 110, low: 95, close: 105 },
    ];
    const fourHour: CandleLike[] = [
      { timestamp: new Date("2024-01-01T20:00:00Z"), open: 102, high: 107, low: 101, close: 106 },
    ];
    const fifteen: CandleLike[] = [
      { timestamp: new Date("2024-01-01T23:45:00Z"), open: 105, high: 107, low: 104, close: 106 },
    ];

    const metrics = await buildMarketMetrics({
      candlesByTimeframe: { "1D": daily, "4H": fourHour, "15m": fifteen },
      referencePrice: 100,
      timeframes: ["1D", "4H", "15m"],
      now: asOf,
      profile: "SWING",
    });

    expect(metrics.priceDriftPct).toBeCloseTo(6, 1);
    expect(metrics.isStale).toBe(false);
    expect(metrics.reasons.length).toBe(0);
  });

  it("keeps intraday drift >5% as a stale reason", async () => {
    const asOf = new Date("2024-01-02T00:00:00Z");
    const daily: CandleLike[] = [
      { timestamp: new Date("2024-01-01T00:00:00Z"), open: 100, high: 110, low: 95, close: 105 },
    ];
    const fifteen: CandleLike[] = [
      { timestamp: new Date("2024-01-01T23:45:00Z"), open: 105, high: 107, low: 104, close: 106 },
    ];

    const metrics = await buildMarketMetrics({
      candlesByTimeframe: { "1D": daily, "15m": fifteen },
      referencePrice: 100,
      timeframes: ["1D", "15m"],
      now: asOf,
    });

    expect(metrics.priceDriftPct).toBeCloseTo(6, 1);
    expect(metrics.isStale).toBe(true);
    expect(metrics.reasons.some((reason) => reason.includes("Price drift"))).toBe(true);
  });
});
