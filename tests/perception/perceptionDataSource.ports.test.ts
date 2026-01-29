import { describe, expect, it } from "vitest";
import { createPerceptionDataSource, type PerceptionDataSourceDeps } from "@/src/lib/engine/perceptionDataSource";
import type { CandleInsert, CandleRow, CandleTimeframe } from "@/src/domain/market-data/types";
import type { EventInsert, EventRow } from "@/src/domain/events/types";
import type { SentimentSnapshot } from "@/src/domain/sentiment/types";

const stubDeps: PerceptionDataSourceDeps = {
  assets: { getActiveAssets: async () => [] },
  events: {
    upsertMany: async (_events: EventInsert[]) => ({ inserted: 0, updated: 0, upserted: 0 }),
    findRelevant: async () => [] as EventRow[],
  },
  candles: {
    upsertMany: async (_candles: CandleInsert[]) => ({ inserted: 0, updated: 0, upserted: 0 }),
    findLatestByAsset: async () => [] as CandleRow[],
    findRangeByAsset: async () => [] as CandleRow[],
  },
  sentiment: {
    fetchSentiment: async (params: { assetId: string; asOf: Date }): Promise<SentimentSnapshot> => ({
      assetId: params.assetId,
      asOf: params.asOf,
      score: 50,
      raw: null,
    }),
  },
  biasProvider: {
    getBiasSnapshot: async () => null,
  },
  timeframeConfig: {
    getProfileTimeframes: () => ["1D" as CandleTimeframe],
    getTimeframesForAsset: () => ["1D" as CandleTimeframe],
    TIMEFRAME_SYNC_WINDOWS: { "1D": 180, "4H": 90, "1H": 30, "15m": 7, "1W": 730 },
  },
  resolveProviderSymbol: () => null,
  allowSync: false,
};

describe("createPerceptionDataSource (mock mode)", () => {
  it("builds data source with provided deps and mock mode", async () => {
    const prev = process.env.PERCEPTION_DATA_MODE;
    process.env.PERCEPTION_DATA_MODE = "mock";
    const dataSource = createPerceptionDataSource(stubDeps);
    const setups = await dataSource.getSetupsForToday({ asOf: new Date("2024-01-01") });
    expect(Array.isArray(setups)).toBe(true);
    process.env.PERCEPTION_DATA_MODE = prev;
  });
});
