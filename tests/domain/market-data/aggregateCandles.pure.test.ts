import { describe, expect, it } from "vitest";
import { aggregateCandles, type CandleLike } from "@/src/domain/market-data/services/aggregateCandles";

const make = (iso: string, close: number, volume = 1): CandleLike => ({
  assetId: "A",
  timeframe: "1H",
  timestamp: new Date(iso),
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume,
  source: "test",
});

describe("aggregateCandles", () => {
  it("aggregates 1H into 4H UTC buckets correctly", () => {
    const asOf = new Date("2024-01-02T04:00:00Z");
    const candles = [
      make("2024-01-02T00:00:00Z", 100, 10),
      make("2024-01-02T01:00:00Z", 101, 12),
      make("2024-01-02T02:00:00Z", 99, 8),
      make("2024-01-02T03:00:00Z", 102, 9),
    ];

    const result = aggregateCandles({
      candles,
      sourceTimeframe: "1H",
      targetTimeframe: "4H",
      asOf,
    });

    expect(result).toHaveLength(1);
    const bucket = result[0];
    expect(bucket.timestamp.toISOString()).toBe("2024-01-02T00:00:00.000Z");
    expect(bucket.open).toBe(100);
    expect(bucket.close).toBe(102);
    expect(bucket.high).toBe(103);
    expect(bucket.low).toBe(98);
    expect(bucket.volume).toBe(39);
  });

  it("is deterministic given same inputs and asOf", () => {
    const asOf = new Date("2024-01-02T04:00:00Z");
    const candles = [make("2024-01-02T00:00:00Z", 100)];

    const a = aggregateCandles({
      candles,
      sourceTimeframe: "1H",
      targetTimeframe: "4H",
      asOf,
    });
    const b = aggregateCandles({
      candles,
      sourceTimeframe: "1H",
      targetTimeframe: "4H",
      asOf,
    });

    expect(a).toEqual(b);
  });
});
