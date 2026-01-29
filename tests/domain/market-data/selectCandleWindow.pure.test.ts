import { describe, expect, it } from "vitest";
import { selectCandleWindow } from "@/src/domain/market-data/services/selectCandleWindow";

const make = (iso: string, close: number) => ({
  assetId: "A",
  timeframe: "1H",
  timestamp: new Date(iso),
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
  source: "test",
});

describe("selectCandleWindow", () => {
  it("filters by asOf and returns most recent first", () => {
    const candles = [
      make("2024-01-02T01:00:00Z", 101),
      make("2024-01-01T23:00:00Z", 99),
      make("2024-01-02T02:00:00Z", 102),
    ];
    const asOf = new Date("2024-01-02T02:30:00Z");

    const result = selectCandleWindow({ candles, asOf, lookbackCount: 2 });

    expect(result).toHaveLength(2);
    expect(result[0].timestamp.toISOString()).toBe("2024-01-02T02:00:00.000Z");
    expect(result[1].timestamp.toISOString()).toBe("2024-01-02T01:00:00.000Z");
  });
});
