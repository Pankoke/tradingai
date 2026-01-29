import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";

const mockGetActiveAssets = vi.fn();
const mockGetTimeframesForAsset = vi.fn();
const mockGetLatestCandleForAsset = vi.fn();
const mockSync = vi.fn();
const mockAudit = vi.fn();
const mockAllowed = vi.fn<[], MarketTimeframe[]>();
const mockDerive4h = vi.fn();
const mockGetContainer = vi.fn();

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getActiveAssets: (...args: unknown[]) => mockGetActiveAssets(...args),
}));

vi.mock("@/src/server/marketData/timeframeConfig", () => ({
  getTimeframesForAsset: (...args: unknown[]) => mockGetTimeframesForAsset(...args),
  getProfileTimeframes: () => ["1D", "1W"],
}));

vi.mock("@/src/lib/config/candleTimeframes", () => ({
  getAllowedIntradayTimeframes: () => mockAllowed(),
}));

vi.mock("@/src/server/repositories/candleRepository", () => ({
  getLatestCandleForAsset: (...args: unknown[]) => mockGetLatestCandleForAsset(...args),
}));

vi.mock("@/src/features/marketData/syncDailyCandles", () => ({
  syncDailyCandlesForAsset: (...args: unknown[]) => mockSync(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockAudit(...args),
}));

vi.mock("@/src/server/marketData/deriveTimeframes", () => ({
  deriveCandlesForTimeframe: (...args: unknown[]) => mockDerive4h(...args),
}));

vi.mock("@/src/server/marketData/requestThrottler", () => ({
  consumeThrottlerStats: () => ({}),
}));

vi.mock("@/src/server/container", () => ({
  getContainer: () => mockGetContainer(),
}));

describe("POST /api/cron/marketdata/intraday", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    process.env.CRON_SECRET = "cron-secret";
    process.env.INTRADAY_ASSET_WHITELIST = "BTCUSDT,ETHUSDT";
    mockGetContainer.mockReturnValue({
      candleRepo: {} as never,
      eventRepo: {} as never,
      marketData: {} as never,
      sentiment: {} as never,
      snapshotStore: {} as never,
    });
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
    delete process.env.INTRADAY_ASSET_WHITELIST;
  });

  it("syncs only intraday timeframes (1H/4H) and skips fresh candles", async () => {
    mockAllowed.mockReturnValue(["1H", "4H"]);
    mockGetActiveAssets.mockResolvedValue([{ id: "a1", symbol: "BTCUSDT", assetClass: "crypto" }]);
    mockGetTimeframesForAsset.mockReturnValue(["1D", "4H", "1H"]);
    const now = Date.now();
    mockGetLatestCandleForAsset.mockImplementation(({ timeframe }: { timeframe: MarketTimeframe }) => {
      if (timeframe === "4H") {
        return { timestamp: new Date(now - 80 * 60 * 1000) };
      }
      return { timestamp: new Date(now - 30 * 60 * 1000) }; // fresh -> skip
    });
    mockSync.mockResolvedValue(undefined);
    mockDerive4h.mockResolvedValue({
      ok: true,
      derivedComputed: 0,
      upserted: 0,
      updated: 0,
      missingInputs: 0,
      warnings: [],
      durationMs: 1,
      params: {
        assetId: "a1",
        sourceTimeframe: "1H",
        targetTimeframe: "4H",
        lookbackCount: 1,
        asOf: new Date(),
      },
    });

    const { POST } = await import("@/src/app/api/cron/marketdata/intraday/route");
    const req = new NextRequest("http://localhost/api/cron/marketdata/intraday", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(mockSync).not.toHaveBeenCalled();
    expect(mockDerive4h).toHaveBeenCalledTimes(1);
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "marketdata.intraday_sync" }));
  });

  it("includes 15m only when enabled", async () => {
    mockAllowed.mockReturnValue(["4H", "1H", "15m"]);
    mockGetActiveAssets.mockResolvedValue([{ id: "a2", symbol: "ETHUSDT", assetClass: "crypto" }]);
    mockGetTimeframesForAsset.mockReturnValue(["4H", "1H", "15m"]);
    mockGetLatestCandleForAsset.mockResolvedValue({ timestamp: new Date(0) });
    mockSync.mockResolvedValue(undefined);
    mockDerive4h.mockResolvedValue({
      ok: true,
      derivedComputed: 0,
      upserted: 0,
      updated: 0,
      missingInputs: 0,
      warnings: [],
      durationMs: 1,
      params: {
        assetId: "a2",
        sourceTimeframe: "1H",
        targetTimeframe: "4H",
        lookbackCount: 1,
        asOf: new Date(),
      },
    });

    const { POST } = await import("@/src/app/api/cron/marketdata/intraday/route");
    const req = new NextRequest("http://localhost/api/cron/marketdata/intraday", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret" },
    });
    await POST(req);

    const timeframes = mockSync.mock.calls.map((call) => call[0].timeframe);
    expect(timeframes).toEqual(expect.arrayContaining(["1H", "15m"]));
    expect(timeframes).not.toContain("4H");
  });

  it("rejects unauthorized requests", async () => {
    const { POST } = await import("@/src/app/api/cron/marketdata/intraday/route");
    const req = new NextRequest("http://localhost/api/cron/marketdata/intraday", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });
});
