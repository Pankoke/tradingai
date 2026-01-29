import { describe, expect, it, vi } from "vitest";
import { createPerceptionDataSource, type PerceptionDataSourceDeps } from "@/src/lib/engine/perceptionDataSource";
import type { CandleRow, CandleTimeframe } from "@/src/domain/market-data/types";
import type { SentimentSnapshot } from "@/src/domain/sentiment/types";

const assets = [
  { id: "GC=F", symbol: "GC=F", name: "Gold Futures", assetClass: "commodity" },
  { id: "EURUSD", symbol: "EURUSD", name: "Euro Dollar", assetClass: "fx" },
];

const makeCandle = (assetId: string, timeframe: CandleTimeframe): CandleRow => ({
  id: `${assetId}-${timeframe}`,
  assetId,
  timeframe,
  timestamp: new Date("2024-12-31T00:00:00Z"),
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 500,
  source: "mock",
});

function buildDeps(): PerceptionDataSourceDeps {
  return {
    assets: { getActiveAssets: vi.fn(async () => assets) },
    events: {
      findRelevant: vi.fn(async () => []),
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
    },
    candles: {
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
      findLatestByAsset: vi.fn(async (assetId: string, timeframe: CandleTimeframe) => [
        makeCandle(assetId, timeframe),
      ]),
      findRangeByAsset: vi.fn(async (assetId: string, timeframe: CandleTimeframe) => [
        makeCandle(assetId, timeframe),
      ]),
    },
    sentiment: {
      fetchSentiment: vi.fn(async ({ assetId }: { assetId: string }): Promise<SentimentSnapshot> => ({
        assetId,
        asOf: new Date(),
        score: 60,
        label: "neutral",
        contributions: [],
      })),
    },
    biasProvider: {
      getBiasSnapshot: vi.fn(async () => ({
        assetId: "GC=F",
        date: new Date(),
        timeframe: "1D",
        biasScore: 12,
        confidence: 70,
      })),
    },
    timeframeConfig: {
      getTimeframesForAsset: () => ["1D"],
      TIMEFRAME_SYNC_WINDOWS: {},
      getProfileTimeframes: () => ["1D"],
    },
    resolveProviderSymbol: () => null,
    allowSync: false,
  };
}

describe("createPerceptionDataSource assetFilter", () => {
  it("passes assetFilter into live datasource and filters assets", async () => {
    const ds = createPerceptionDataSource(buildDeps(), { profiles: ["SWING"], assetFilter: ["GC=F"] });
    const setups = await ds.getSetupsForToday({ asOf: new Date() });
    expect(setups.length).toBeGreaterThan(0);
    expect(setups.every((s) => s.assetId === "GC=F")).toBe(true);
  });
});
