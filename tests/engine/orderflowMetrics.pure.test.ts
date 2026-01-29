import { describe, expect, it } from "vitest";
import { buildOrderflowMetrics, ORDERFLOW_TIMEFRAMES, type CandleLike } from "@/src/lib/engine/orderflowMetrics";

const makeCandle = (timestamp: string, close: number, volume = 1000): CandleLike => ({
  timestamp: new Date(timestamp),
  close,
  high: close + 1,
  low: close - 1,
  volume,
});

describe("buildOrderflowMetrics (pure)", () => {
  it("calculates crypto intraday flow deterministically from provided candles", async () => {
    const candlesByTimeframe = {
      "15m": [
        makeCandle("2024-01-02T00:45:00Z", 101, 1500),
        makeCandle("2024-01-02T00:30:00Z", 100),
        makeCandle("2024-01-02T00:15:00Z", 99),
      ],
      "1H": [
        makeCandle("2024-01-02T00:00:00Z", 100),
        makeCandle("2024-01-01T23:00:00Z", 98),
      ],
      "4H": [makeCandle("2024-01-01T20:00:00Z", 95)],
    } satisfies Partial<Record<(typeof ORDERFLOW_TIMEFRAMES)[number], CandleLike[]>>;

    const result = await buildOrderflowMetrics({
      candlesByTimeframe,
      timeframes: ORDERFLOW_TIMEFRAMES,
      assetClass: "crypto",
      trendScore: 60,
      biasScore: 55,
      now: new Date("2024-01-02T01:00:00Z"),
    });

    expect(result.flowScore).toBeGreaterThan(0);
    expect(result.mode).toBeDefined();
    expect(result.meta?.timeframeSamples?.["15m"]).toBe(3);
    expect(result.meta?.profile).toBe("crypto");
  });

  it("falls back gracefully when no intraday data exists", async () => {
    const result = await buildOrderflowMetrics({
      candlesByTimeframe: {},
      assetClass: "crypto",
      timeframes: ORDERFLOW_TIMEFRAMES,
      now: new Date("2024-01-02T01:00:00Z"),
    });

    expect(result.flowScore).toBe(50);
    expect(result.reasons).toContain("Insufficient intraday data for orderflow");
  });
});
