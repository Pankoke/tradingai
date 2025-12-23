import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPerceptionDataSource } from "@/src/lib/engine/perceptionDataSource";

const mockActiveAssets = [
  {
    id: "asset-1",
    symbol: "BTCUSDT",
    assetClass: "crypto",
    isActive: true,
  },
] as const;

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getActiveAssets: vi.fn(async () => mockActiveAssets),
}));

vi.mock("@/src/server/repositories/candleRepository", () => ({
  getLatestCandleForAsset: vi.fn(async ({ timeframe }: { timeframe: string }) => ({
    close: timeframe === "1H" ? "101" : "100",
  })),
}));

vi.mock("@/src/features/marketData/syncDailyCandles", () => ({
  syncDailyCandlesForAsset: vi.fn(async () => {}),
}));

vi.mock("@/src/server/marketData/timeframeConfig", () => ({
  TIMEFRAME_SYNC_WINDOWS: {
    "1D": 180,
    "4H": 90,
    "1H": 30,
    "15m": 7,
  },
  getTimeframesForAsset: vi.fn(() => ["1D", "4H", "1H"]),
}));

vi.mock("@/src/lib/engine/marketMetrics", () => ({
  buildMarketMetrics: vi.fn(async ({ referencePrice }: { referencePrice: number }) => ({
    trendScore: 60,
    momentumScore: 55,
    volatilityScore: 40,
    priceDriftPct: 0,
    isStale: false,
    reasons: [],
    lastPrice: referencePrice,
    evaluatedAt: new Date().toISOString(),
  })),
}));

vi.mock("@/src/lib/engine/orderflowMetrics", () => ({
  buildOrderflowMetrics: vi.fn(async () => ({
    flowScore: 52,
    mode: "buyers",
    clv: 0,
    relVolume: 1,
    expansion: 0,
    consistency: 50,
    reasons: [],
    meta: { timeframeSamples: {}, context: {} },
  })),
}));

vi.mock("@/src/server/providers/biasProvider", () => ({
  DbBiasProvider: vi.fn().mockImplementation(() => ({
    getBiasSnapshot: vi.fn(async () => ({
      biasScore: 10,
      confidence: 60,
      date: new Date(),
    })),
  })),
}));

vi.mock("@/src/server/sentiment/providerResolver", () => ({
  resolveSentimentProvider: vi.fn(() => null),
}));

vi.mock("@/src/lib/engine/sentimentMetrics", () => ({
  buildSentimentMetrics: vi.fn(() => ({
    score: 58,
    label: "neutral",
    reasons: [],
    raw: null,
  })),
}));

describe("LivePerceptionDataSource intraday generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE = "live";
  });

  it("creates both SWING and INTRADAY setups when intraday data is available", async () => {
    const dataSource = createPerceptionDataSource();
    const setups = await dataSource.getSetupsForToday({ asOf: new Date("2025-01-01T00:00:00Z") });
    const profiles = setups.map((s) => s.profile);

    expect(profiles).toContain("SWING");
    expect(profiles).toContain("INTRADAY");

    const swing = setups.find((s) => s.profile === "SWING");
    const intraday = setups.find((s) => s.profile === "INTRADAY");

    expect(swing?.timeframe).toBe("1D");
    expect(intraday?.timeframe).toBe("1H");
    expect(intraday?.id).not.toBe(swing?.id);
    expect((intraday?.levelDebug?.bandPct ?? 1)).toBeLessThan(swing?.levelDebug?.bandPct ?? 0);
  });
});
