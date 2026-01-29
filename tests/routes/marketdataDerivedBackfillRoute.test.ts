import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockIsAdminEnabled = vi.fn();
const mockIsAdminSession = vi.fn();
const mockValidateOrigin = vi.fn();
const mockGetActiveAssets = vi.fn();
const mockDerive = vi.fn();
const mockGetContainer = vi.fn();

vi.mock("@/src/lib/admin/security", () => ({
  isAdminEnabled: () => mockIsAdminEnabled(),
  validateAdminRequestOrigin: () => mockValidateOrigin(),
}));

vi.mock("@/src/lib/admin/auth", () => ({
  isAdminSessionFromRequest: () => mockIsAdminSession(),
}));

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getActiveAssets: () => mockGetActiveAssets(),
}));

vi.mock("@/src/server/container", () => ({
  getContainer: () => mockGetContainer(),
}));

vi.mock("@/src/server/marketData/deriveTimeframes", () => ({
  deriveCandlesForTimeframe: (...args: unknown[]) => mockDerive(...args),
}));

describe("POST /api/admin/marketdata/derived-backfill", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsAdminEnabled.mockReturnValue(true);
    mockIsAdminSession.mockReturnValue(true);
    mockValidateOrigin.mockReturnValue(true);
    mockGetActiveAssets.mockResolvedValue([{ id: "a1", symbol: "AAA" }]);
    mockGetContainer.mockReturnValue({
      candleRepo: {} as never,
      eventRepo: {} as never,
      marketData: {} as never,
      sentiment: {} as never,
      snapshotStore: {} as never,
    });
    mockDerive.mockResolvedValue({
      ok: true,
      derivedComputed: 1,
      upserted: 1,
      updated: 0,
      missingInputs: 0,
      warnings: [],
      durationMs: 1,
      params: { assetId: "a1", sourceTimeframe: "1H", targetTimeframe: "4H", lookbackCount: 36, asOf: new Date() },
    });
  });

  it("chunks the requested window and calls derive for each chunk", async () => {
    const from = "2024-01-01T00:00:00Z";
    const to = "2024-01-01T06:00:00Z";
    const body = { from, to, chunkHours: 3, targetTimeframe: "4H" };
    const req = new NextRequest("http://localhost/api/admin/marketdata/derived-backfill", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const { POST } = await import("@/src/app/api/admin/marketdata/derived-backfill/route");
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockDerive).toHaveBeenCalledTimes(2); // 0-3h, 3-6h
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.chunks).toHaveLength(2);
  });
});
