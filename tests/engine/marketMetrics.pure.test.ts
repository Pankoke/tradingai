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
});
