import { describe, expect, it, vi } from "vitest";
import { createPerceptionDataSource, type PerceptionDataSourceDeps } from "@/src/lib/engine/perceptionDataSource";
import type { CandleRow } from "@/src/domain/market-data/types";
import type { SentimentSnapshot } from "@/src/domain/sentiment/types";

const baseCandle: CandleRow = {
  id: "GC-1D",
  assetId: "GC=F",
  timeframe: "1D",
  timestamp: new Date("2026-02-01T00:00:00Z"),
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 1000,
  source: "mock",
};

function buildDeps(overrides: Partial<PerceptionDataSourceDeps> = {}): PerceptionDataSourceDeps {
  const deps: PerceptionDataSourceDeps = {
    assets: { getActiveAssets: vi.fn(async () => [{ id: "GC=F", symbol: "GC=F", assetClass: "commodity" }]) },
    events: {
      findRelevant: vi.fn(async () => []),
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
    } as never,
    candles: {
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
      findLatestByAsset: vi.fn(async (_assetId: string, _tf: string, _limit: number) => [baseCandle]),
      findRangeByAsset: vi.fn(async (_assetId: string, _tf: string, _from: Date, _to: Date) => [baseCandle]),
    },
    sentiment: {
      fetchSentiment: vi.fn(async ({ assetId, asOf }: { assetId: string; asOf: Date }): Promise<SentimentSnapshot> => ({
        assetId,
        asOf,
        score: 55,
        label: "neutral",
        raw: null,
      })),
    },
    biasProvider: {
      getBiasSnapshot: vi.fn(async () => ({
        biasScore: 10,
        confidence: 60,
        date: new Date(),
        timeframe: "1D",
      })),
    },
    timeframeConfig: {
      getProfileTimeframes: () => ["1D", "1W"],
      getTimeframesForAsset: () => ["1D", "1W"],
      TIMEFRAME_SYNC_WINDOWS: { "1D": 180, "1W": 730, "4H": 90, "1H": 30, "15m": 7 },
      getSwingCoreTimeframes: () => ["1D", "1W"],
      getSwingRefinementTimeframes: () => ["4H"],
      getAllowedTimeframesForProfile: () => ["1D", "1W"],
    },
    resolveProviderSymbol: vi.fn(),
    allowSync: false,
  };
  return { ...deps, ...overrides };
}

describe("LivePerceptionDataSource swing timeframe guard", () => {
  it("throws when swing core timeframes include intraday frames", async () => {
    const deps = buildDeps({
      timeframeConfig: {
        getProfileTimeframes: () => ["1D", "1W"],
        getTimeframesForAsset: () => ["1D", "1W"],
        TIMEFRAME_SYNC_WINDOWS: { "1D": 180, "1W": 730, "4H": 90, "1H": 30, "15m": 7 },
        getSwingCoreTimeframes: () => ["1D", "1H"],
        getSwingRefinementTimeframes: () => ["4H"],
        getAllowedTimeframesForProfile: () => ["1D", "1W"],
      },
    });
    const ds = createPerceptionDataSource(deps, { profiles: ["SWING"] });
    await expect(ds.getSetupsForToday({ asOf: new Date("2026-02-02") })).rejects.toThrow(
      /Invalid timeframe for SWING core/,
    );
  });

  it("allows swing core timeframes 1D/1W with refinement 4H", async () => {
    const deps = buildDeps();
    const ds = createPerceptionDataSource(deps, { profiles: ["SWING"] });
    const setups = await ds.getSetupsForToday({ asOf: new Date("2026-02-02") });
    expect(Array.isArray(setups)).toBe(true);
  });
});
