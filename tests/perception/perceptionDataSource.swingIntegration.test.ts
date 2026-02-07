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

const oneHourCandles: CandleRow[] = [
  {
    ...dailyCandle,
    id: "GC-1H-1",
    timeframe: "1H",
    timestamp: new Date("2026-02-01T09:00:00Z"),
    open: 103.8,
    high: 104.3,
    low: 103.5,
    close: 104.0,
  },
  {
    ...dailyCandle,
    id: "GC-1H-2",
    timeframe: "1H",
    timestamp: new Date("2026-02-01T10:00:00Z"),
    open: 104.0,
    high: 104.4,
    low: 103.7,
    close: 104.1,
  },
  {
    ...dailyCandle,
    id: "GC-1H-3",
    timeframe: "1H",
    timestamp: new Date("2026-02-01T11:00:00Z"),
    open: 104.1,
    high: 104.5,
    low: 103.9,
    close: 104.2,
  },
  {
    ...dailyCandle,
    id: "GC-1H-4",
    timeframe: "1H",
    timestamp: new Date("2026-02-01T12:00:00Z"),
    open: 104.2,
    high: 104.6,
    low: 104.0,
    close: 104.3,
  },
];

function buildDeps(options: { include4h: boolean; include1h?: boolean }): PerceptionDataSourceDeps {
  const findRangeByAsset = vi.fn(
    async (_assetId: string, timeframe: string): Promise<CandleRow[]> => {
      if (timeframe === "1D") return [dailyCandle];
      if (timeframe === "1W") return [];
      if (timeframe === "4H" && options.include4h) return [fourHourFresh];
      if (timeframe === "1H" && options.include1h) return oneHourCandles;
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
    const with4h = setupsWith4h[0];

    const depsWithout4h = buildDeps({ include4h: false });
    const dsWithout4h = createPerceptionDataSource(depsWithout4h, { profiles: ["SWING"] });
    const setupsWithout4h = await dsWithout4h.getSetupsForToday({ asOf });
    expect(setupsWithout4h.length).toBeGreaterThan(0);
    const without4h = setupsWithout4h[0];

    // Refinement must not change decision-grade semantics.
    expect(with4h.decision ?? null).toBe(without4h.decision ?? null);
    expect(with4h.grade ?? null).toBe(without4h.grade ?? null);
  });

  it("derives 4H from 1H for swing refinement when direct 4H candles are missing", async () => {
    const deps = buildDeps({ include4h: false, include1h: true });
    const ds = createPerceptionDataSource(deps, { profiles: ["SWING"] });
    const setups = await ds.getSetupsForToday({ asOf });
    expect(setups.length).toBeGreaterThan(0);

    const setup = setups[0];
    expect(setup.levelDebug?.refinementAttempted).toBe(true);
    expect(setup.levelDebug?.refinementAttemptReason).toBe("has_levels");
    expect(setup.levelDebug?.refinementSource).toBe("4H");
    expect(setup.levelDebug?.levelsRefinementReason).toBe("applied");
    expect(setup.levelDebug?.refinementEffect?.boundsMode).toBeDefined();
  });
});
