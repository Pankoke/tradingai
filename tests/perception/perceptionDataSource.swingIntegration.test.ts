import { describe, expect, it, vi } from "vitest";
import { createPerceptionDataSource, type PerceptionDataSourceDeps } from "@/src/lib/engine/perceptionDataSource";
import type { CandleRow } from "@/src/domain/market-data/types";
import type { SentimentSnapshot } from "@/src/domain/sentiment/types";

const asOf = new Date("2026-02-01T12:00:00Z");

const dailyCandle: CandleRow = {
  id: "GC-1D",
  assetId: "GC=F",
  timeframe: "1D",
  timestamp: new Date("2026-02-01T00:00:00Z"),
  open: 100,
  high: 105,
  low: 99,
  close: 104,
  volume: 1000,
  source: "mock",
};

const fourHourFresh: CandleRow = {
  ...dailyCandle,
  id: "GC-4H",
  timeframe: "4H",
  timestamp: new Date("2026-02-01T08:00:00Z"),
};

function buildDeps(options: { include4h: boolean }): PerceptionDataSourceDeps {
  const findRangeByAsset = vi.fn(
    async (_assetId: string, timeframe: string): Promise<CandleRow[]> => {
      if (timeframe === "1D") return [dailyCandle];
      if (timeframe === "1W") return [];
      if (timeframe === "4H" && options.include4h) return [fourHourFresh];
      return [];
    },
  );

  const deps: PerceptionDataSourceDeps = {
    assets: { getActiveAssets: vi.fn(async () => [{ id: "GC=F", symbol: "GC=F", assetClass: "commodity" }]) },
    events: {
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
      findRelevant: vi.fn(async () => []),
    },
    candles: {
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
      findLatestByAsset: vi.fn(async () => []),
      findRangeByAsset,
    },
    sentiment: {
      fetchSentiment: vi.fn(
        async ({ assetId, asOf: date }: { assetId: string; asOf: Date }): Promise<SentimentSnapshot> => ({
          assetId,
          asOf: date,
          score: 55,
          raw: null,
        }),
      ),
    },
    biasProvider: {
      getBiasSnapshot: vi.fn(async () => ({
        biasScore: 12,
        confidence: 70,
        date: asOf,
        timeframe: "1D",
      })),
    },
    timeframeConfig: {
      getProfileTimeframes: () => ["1D", "1W"],
      getTimeframesForAsset: () => ["1D", "1W", "4H"],
      TIMEFRAME_SYNC_WINDOWS: { "1D": 180, "4H": 90, "1H": 30, "15m": 7, "1W": 730 },
      getSwingCoreTimeframes: () => ["1D", "1W"],
      getSwingRefinementTimeframes: () => ["4H"],
      getAllowedTimeframesForProfile: (_profile: string, opts?: { includeRefinement?: boolean }) =>
        opts?.includeRefinement ? ["1D", "1W", "4H"] : ["1D", "1W"],
    },
    resolveProviderSymbol: vi.fn(),
    allowSync: false,
  };

  return deps;
}

describe("perceptionDataSource swing integration guards", () => {
  it("does not request intraday candles for swing core and tolerates missing intraday data", async () => {
    const deps = buildDeps({ include4h: true });
    const ds = createPerceptionDataSource(deps, { profiles: ["SWING"] });

    const setups = await ds.getSetupsForToday({ asOf });

    expect(setups.length).toBeGreaterThan(0);
    const calls = (deps.candles.findRangeByAsset as unknown as vi.Mock).mock.calls.map(([, tf]) => tf);
    expect(calls).not.toContain("1H");
    expect(calls).not.toContain("15m");
  });

  it("treats 4H refinement as optional: present is accepted, missing stays neutral without failure", async () => {
    const depsWith4h = buildDeps({ include4h: true });
    const dsWith4h = createPerceptionDataSource(depsWith4h, { profiles: ["SWING"] });
    const setupsWith4h = await dsWith4h.getSetupsForToday({ asOf });
    expect(setupsWith4h.length).toBeGreaterThan(0);

    const depsWithout4h = buildDeps({ include4h: false });
    const dsWithout4h = createPerceptionDataSource(depsWithout4h, { profiles: ["SWING"] });
    const setupsWithout4h = await dsWithout4h.getSetupsForToday({ asOf });
    expect(setupsWithout4h.length).toBeGreaterThan(0);
  });
});
