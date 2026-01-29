import { describe, expect, it, vi } from "vitest";
import { deriveCandlesForTimeframe } from "@/src/server/marketData/deriveTimeframes";
import type { CandleRepositoryPort } from "@/src/domain/market-data/ports";
import type { CandleRow } from "@/src/domain/market-data/types";
import type { DerivedPair } from "@/src/server/marketData/derived-config";

const candle = (iso: string): CandleRow => ({
  id: `c-${iso}`,
  assetId: "X",
  timeframe: "1H",
  timestamp: new Date(iso),
  open: 1,
  high: 2,
  low: 0.5,
  close: 1.5,
  volume: 10,
  source: "provider",
});

describe("deriveCandlesForTimeframe generalized", () => {
  it("uses derivedPair overrides and returns metrics", async () => {
    const pair: DerivedPair = { source: "1H", target: "4H", lookbackCount: 4 };
    const asOf = new Date("2024-01-02T08:00:00Z");
    const mockRepo: CandleRepositoryPort = {
      findRangeByAsset: vi.fn(async () => [candle("2024-01-02T04:00:00Z"), candle("2024-01-02T05:00:00Z")]),
      upsertMany: vi.fn(async () => ({ inserted: 1, updated: 0 })),
      findLatestByAsset: vi.fn(),
    };

    const result = await deriveCandlesForTimeframe({
      assetId: "X",
      sourceTimeframe: "1H",
      targetTimeframe: "4H",
      lookbackCount: 1,
      asOf,
      candleRepo: mockRepo,
      derivedPair: pair,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.missingInputs).toBe(2); // pair.lookbackCount 4 minus 2 provided
    expect(result.derivedComputed).toBe(1);
    expect(result.warnings).toContain("missingInputs~2 (source candles below requested lookback)");
    expect(mockRepo.findRangeByAsset).toHaveBeenCalledWith("X", "1H", expect.any(Date), asOf);
  });
});
