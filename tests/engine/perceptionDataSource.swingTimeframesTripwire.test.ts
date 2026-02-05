import { describe, expect, it, vi } from "vitest";
import { createPerceptionDataSource, type PerceptionDataSourceDeps } from "@/src/lib/engine/perceptionDataSource";

function buildDeps(core: string[]): PerceptionDataSourceDeps {
  return {
    assets: { getActiveAssets: vi.fn(async () => [{ id: "GC=F", symbol: "GC=F", assetClass: "commodity" }]) },
    events: {
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
      findRelevant: vi.fn(async () => []),
    },
    candles: {
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
      findLatestByAsset: vi.fn(async () => []),
      findRangeByAsset: vi.fn(async () => []),
    },
    sentiment: {
      fetchSentiment: vi.fn(async () => ({ assetId: "GC=F", asOf: new Date(), score: 50, raw: null })),
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
      getProfileTimeframes: () => core as ("1D" | "1W" | "1H" | "15m" | "4H")[],
      getTimeframesForAsset: () => core as ("1D" | "1W" | "1H" | "15m" | "4H")[],
      TIMEFRAME_SYNC_WINDOWS: { "1D": 180, "1W": 730, "4H": 90, "1H": 30, "15m": 7 },
      getSwingCoreTimeframes: () => core as ("1D" | "1W" | "1H" | "15m" | "4H")[],
      getSwingRefinementTimeframes: () => ["4H"],
      getAllowedTimeframesForProfile: () => core as ("1D" | "1W" | "1H" | "15m" | "4H")[],
    },
    resolveProviderSymbol: vi.fn(),
    allowSync: false,
  };
}

describe("Swing timeframe guard tripwire", () => {
  it("throws when swing core includes intraday timeframes", async () => {
    const deps = buildDeps(["1D", "1H"]);
    const ds = createPerceptionDataSource(deps, { profiles: ["SWING"] });
    await expect(ds.getSetupsForToday({ asOf: new Date() })).rejects.toThrow(/Invalid timeframe for SWING core/);
  });

  it("allows 1D/1W core with optional 4H refinement", async () => {
    const deps = buildDeps(["1D", "1W"]);
    const ds = createPerceptionDataSource(deps, { profiles: ["SWING"] });
    const setups = await ds.getSetupsForToday({ asOf: new Date() });
    expect(Array.isArray(setups)).toBe(true);
  });
});
