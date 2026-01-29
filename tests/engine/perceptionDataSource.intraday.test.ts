import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPerceptionDataSource, type PerceptionDataSourceDeps } from "@/src/lib/engine/perceptionDataSource";
import { syncDailyCandlesForAsset } from "@/src/features/marketData/syncDailyCandles";
import type { CandleRow, CandleTimeframe } from "@/src/domain/market-data/types";
import type { SentimentSnapshot } from "@/src/domain/sentiment/types";

const mockActiveAssets = [
  {
    id: "asset-1",
    symbol: "BTCUSDT",
    assetClass: "crypto",
    isActive: true,
  },
] as const;

vi.mock("@/src/features/marketData/syncDailyCandles", () => ({
  syncDailyCandlesForAsset: vi.fn(async () => {}),
}));

vi.mock("@/src/server/marketData/timeframeConfig", () => ({
  TIMEFRAME_SYNC_WINDOWS: {
    "1D": 180,
    "1W": 730,
    "4H": 90,
    "1H": 30,
    "15m": 7,
  },
  getTimeframesForAsset: vi.fn(() => ["1D", "1W", "4H", "1H"]),
  getProfileTimeframes: vi.fn((profile: string) => {
    if (profile === "INTRADAY") return ["1H", "4H"];
    if (profile === "POSITION") return ["1W"];
    return ["1D", "1W"];
  }),
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
  DbBiasProvider: class {
    getBiasSnapshot = vi.fn(async () => ({
      biasScore: 10,
      confidence: 60,
      date: new Date(),
    }));
  },
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

const asOf = new Date("2025-01-01T00:00:00Z");

const makeCandle = (timeframe: CandleTimeframe, close: number, timestamp: string): CandleRow => ({
  id: `${timeframe}-${timestamp}`,
  assetId: "asset-1",
  timeframe,
  timestamp: new Date(timestamp),
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1000,
  source: "mock",
});

const candleStore: Record<CandleTimeframe, CandleRow[]> = {
  "1D": [makeCandle("1D", 100, "2024-12-31T00:00:00Z")],
  "1W": [makeCandle("1W", 150, "2024-12-29T00:00:00Z")],
  "4H": [makeCandle("4H", 102, "2024-12-31T20:00:00Z")],
  "1H": [makeCandle("1H", 101, "2024-12-31T23:00:00Z")],
  "15m": [makeCandle("15m", 101, "2024-12-31T23:45:00Z")],
};

function buildDeps(overrides: Partial<PerceptionDataSourceDeps> = {}): PerceptionDataSourceDeps {
  const deps: PerceptionDataSourceDeps = {
    assets: { getActiveAssets: vi.fn(async () => mockActiveAssets as unknown as typeof mockActiveAssets) },
    events: {
      findRelevant: vi.fn(async () => []),
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
    },
    candles: {
      upsertMany: vi.fn(async () => ({ inserted: 0, updated: 0, upserted: 0 })),
      findLatestByAsset: vi.fn(async (_assetId: string, timeframe: CandleTimeframe) => candleStore[timeframe] ?? []),
      findRangeByAsset: vi.fn(async (_assetId: string, timeframe: CandleTimeframe) => candleStore[timeframe] ?? []),
    },
    sentiment: {
      fetchSentiment: vi.fn(async ({ assetId }: { assetId: string }): Promise<SentimentSnapshot> => ({
        assetId,
        asOf,
        score: 55,
        label: "neutral",
        confidence: 60,
      })),
    },
    biasProvider: {
      getBiasSnapshot: vi.fn(async () => ({
        assetId: "asset-1",
        date: asOf,
        timeframe: "1D",
        biasScore: 10,
        confidence: 60,
      })),
    },
    timeframeConfig: {
      TIMEFRAME_SYNC_WINDOWS: {
        "1D": 180,
        "1W": 730,
        "4H": 90,
        "1H": 30,
        "15m": 7,
      },
      getTimeframesForAsset: vi.fn(() => ["1D", "1W", "4H", "1H"]),
      getProfileTimeframes: vi.fn((profile: string) => {
        if (profile === "INTRADAY") return ["1H", "4H"];
        if (profile === "POSITION") return ["1W"];
        return ["1D", "1W"];
      }),
    },
    resolveProviderSymbol: () => null,
    allowSync: true,
  };

  return { ...deps, ...overrides };
}

describe("LivePerceptionDataSource intraday generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE = "live";
  });

  it("creates both SWING and INTRADAY setups when intraday data is available", async () => {
    const dataSource = createPerceptionDataSource(buildDeps());
    const setups = await dataSource.getSetupsForToday({ asOf });
    const profiles = setups.map((s) => s.profile);

    expect(profiles).toContain("SWING");
    expect(profiles).toContain("INTRADAY");
    expect(profiles).toContain("POSITION");

    const swing = setups.find((s) => s.profile === "SWING");
    const intraday = setups.find((s) => s.profile === "INTRADAY");
    const position = setups.find((s) => s.profile === "POSITION");

    expect(swing?.timeframe).toBe("1D");
    expect(intraday?.timeframe).toBe("1H");
    expect(intraday?.id).not.toBe(swing?.id);
    expect((intraday?.levelDebug?.bandPct ?? 1)).toBeLessThan(swing?.levelDebug?.bandPct ?? 0);
    expect(position?.timeframe).toBe("1W");
    expect((position?.levelDebug?.bandPct ?? 0)).toBeGreaterThan(swing?.levelDebug?.bandPct ?? 0);
  });

  it("does not attempt candle sync when allowSync is false", async () => {
    const deps = buildDeps({ allowSync: false });
    const dataSource = createPerceptionDataSource(deps);
    await dataSource.getSetupsForToday({ asOf });

    expect(syncDailyCandlesForAsset).not.toHaveBeenCalled();
  });
});
