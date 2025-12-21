import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockGetActiveAssets = vi.fn();
const mockSync = vi.fn();
const mockAudit = vi.fn();

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getActiveAssets: (...args: unknown[]) => mockGetActiveAssets(...args),
}));

vi.mock("@/src/features/marketData/syncDailyCandles", () => ({
  syncDailyCandlesForAsset: (...args: unknown[]) => mockSync(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockAudit(...args),
}));

describe("POST /api/cron/marketdata/sync", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns ok when authorized", async () => {
    mockGetActiveAssets.mockResolvedValue([
      { id: "a1", symbol: "BTC-USD", assetClass: "crypto" },
      { id: "a2", symbol: "AAPL", assetClass: "equity" },
    ]);
    mockSync.mockResolvedValue(undefined);
    const { POST } = await import("@/src/app/api/cron/marketdata/sync/route");
    const req = new NextRequest("http://localhost/api/cron/marketdata/sync", {
      headers: { authorization: "Bearer cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.processed).toBe(2);
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "marketdata_sync", ok: true }));
  });

  it("rejects when unauthorized", async () => {
    const { POST } = await import("@/src/app/api/cron/marketdata/sync/route");
    const req = new NextRequest("http://localhost/api/cron/marketdata/sync");
    const res = await POST(req);
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });
});
