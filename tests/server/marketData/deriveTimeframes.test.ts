import { describe, expect, it, vi } from "vitest";
import { deriveCandlesForTimeframe } from "@/src/server/marketData/deriveTimeframes";
import type { CandleRepositoryPort } from "@/src/domain/market-data/ports";
import type { CandleRow } from "@/src/domain/market-data/types";

const make = (iso: string, close: number): CandleRow => ({
  id: `c-${iso}`,
  assetId: "A",
  timeframe: "1H",
  timestamp: new Date(iso),
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
  source: "provider",
});

describe("deriveCandlesForTimeframe", () => {
  it("aggregates and upserts derived 4H candles deterministically", async () => {
    const asOf = new Date("2024-01-02T08:00:00Z");
    const rows = [
      make("2024-01-02T04:00:00Z", 104),
      make("2024-01-02T05:00:00Z", 103),
      make("2024-01-02T06:00:00Z", 106),
      make("2024-01-02T07:00:00Z", 105),
    ];

    const mockRepo: CandleRepositoryPort = {
      upsertMany: vi.fn(async () => ({ inserted: 1, updated: 0 })),
      findRangeByAsset: vi.fn(async () => rows),
      findLatestByAsset: vi.fn(),
    };

    const result = await deriveCandlesForTimeframe({
      assetId: "A",
      sourceTimeframe: "1H",
      targetTimeframe: "4H",
      lookbackCount: 8,
      asOf,
      candleRepo: mockRepo,
      sourceLabel: "derived",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.derivedComputed).toBe(1);
    expect(result.upserted).toBe(1);
    expect(mockRepo.upsertMany).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(mockRepo.upsertMany).mock.calls[0][0];
    expect(payload[0].timeframe).toBe("4H");
    expect(payload[0].source).toBe("derived");
    expect(payload[0].timestamp.toISOString()).toBe("2024-01-02T04:00:00.000Z");
    expect(payload[0].open).toBe(104);
    expect(payload[0].close).toBe(105);
  });

  it("returns a structured error when fetch fails", async () => {
    const asOf = new Date("2024-01-02T08:00:00Z");
    const mockRepo: CandleRepositoryPort = {
      upsertMany: vi.fn(),
      findRangeByAsset: vi.fn(async () => {
        throw new Error("db down");
      }),
      findLatestByAsset: vi.fn(),
    };

    const result = await deriveCandlesForTimeframe({
      assetId: "A",
      sourceTimeframe: "1H",
      targetTimeframe: "4H",
      lookbackCount: 8,
      asOf,
      candleRepo: mockRepo,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("FETCH_FAILED");
    expect(result.error.message).toContain("db down");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
