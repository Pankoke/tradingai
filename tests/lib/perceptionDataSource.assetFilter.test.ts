import { describe, expect, it, vi } from "vitest";
import { createPerceptionDataSource } from "@/src/lib/engine/perceptionDataSource";

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getActiveAssets: vi.fn(async () => [
    { id: "GC=F", symbol: "GC=F", name: "Gold Futures" },
    { id: "EURUSD", symbol: "EURUSD", name: "Euro Dollar" },
  ]),
}));
vi.mock("@/src/lib/engine/setupDefinitions", () => ({
  setupDefinitions: [{ id: "trend_breakout" }, { id: "trend_pullback" }],
}));
vi.mock("@/src/lib/engine/levels", () => ({
  computeLevelsForSetup: vi.fn(async () => ({
    entryZone: "1",
    stopLoss: "0.9",
    takeProfit: "1.1",
    debug: { category: "pullback" },
    riskReward: { riskPercent: 5, rewardPercent: 10, rrr: 2, volatilityLabel: "medium" },
  })),
}));
vi.mock("@/src/server/repositories/candleRepository", () => ({
  getLatestCandleForAsset: vi.fn(async () => ({ timestamp: new Date(), close: 100 })),
}));
vi.mock("@/src/server/marketData/timeframeConfig", () => ({
  getTimeframesForAsset: () => ["1D"],
  TIMEFRAME_SYNC_WINDOWS: {},
  getProfileTimeframes: () => ["1D"],
}));
vi.mock("@/src/lib/engine/marketMetrics", () => ({
  buildMarketMetrics: () => ({
    trendScore: 60,
    momentumScore: 55,
    volatilityScore: 50,
    priceDriftPct: 0,
    lastPrice: 100,
    evaluatedAt: new Date(),
    reasons: [],
    isStale: false,
  }),
}));
vi.mock("@/src/lib/engine/orderflowMetrics", () => ({
  buildOrderflowMetrics: () => ({
    flowScore: 55,
    mode: "balanced",
    reasons: [],
    reasonDetails: [],
    flags: [],
    relVolume: 1,
    expansion: 0,
    clv: 0,
    consistency: 0,
    meta: {},
  }),
}));
vi.mock("@/src/lib/engine/sentimentMetrics", () => ({
  buildSentimentMetrics: () => ({
    score: 60,
    label: "neutral",
    reasons: [],
    flags: [],
    raw: null,
    contributions: [],
    dominantDrivers: [],
  }),
}));
vi.mock("@/src/server/providers/biasProvider", () => ({
  DbBiasProvider: class {
    async getBiasSnapshot() {
      return { scores: [] };
    }
  },
}));
vi.mock("@/src/server/providers/marketDataProvider", () => ({}));
vi.mock("@/src/features/marketData/syncDailyCandles", () => ({
  syncDailyCandlesForAsset: vi.fn(),
}));

describe("createPerceptionDataSource assetFilter", () => {
  it("passes assetFilter into live datasource and filters assets", async () => {
    const ds = createPerceptionDataSource({ allowSync: false, profiles: ["SWING"], assetFilter: ["GC=F"] });
    const setups = await ds.getSetupsForToday({ asOf: new Date() });
    expect(setups.length).toBeGreaterThan(0);
    expect(setups.every((s) => s.assetId === "GC=F")).toBe(true);
  });
});
