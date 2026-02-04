import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIsAdminEnabled = vi.fn();
const mockIsAdminSession = vi.fn();
const mockValidateOrigin = vi.fn();
const mockGetActiveAssets = vi.fn();

vi.mock("@/src/lib/admin/security", () => ({
  isAdminEnabled: () => mockIsAdminEnabled(),
  validateAdminRequestOrigin: () => mockValidateOrigin(),
}));

vi.mock("@/src/lib/admin/auth", () => ({
  isAdminSessionFromRequest: () => mockIsAdminSession(),
}));

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getActiveAssets: (...args: unknown[]) => mockGetActiveAssets(...args),
}));

function buildRequest(url: string) {
  return new NextRequest(url, { method: "GET" });
}

describe("admin assets route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsAdminEnabled.mockReturnValue(true);
    mockIsAdminSession.mockReturnValue(true);
    mockValidateOrigin.mockReturnValue(true);
    mockGetActiveAssets.mockResolvedValue([
      { id: "a1", symbol: "BTC", displaySymbol: "BTC", name: "Bitcoin", assetClass: "crypto" },
    ]);
  });

  it("rejects when admin disabled", async () => {
    mockIsAdminEnabled.mockReturnValue(false);
    const { GET } = await import("@/src/app/api/admin/assets/route");
    const res = await GET(buildRequest("http://localhost/api/admin/assets"));
    expect(res.status).toBe(404);
  });

  it("requires auth", async () => {
    mockIsAdminSession.mockReturnValue(false);
    const { GET } = await import("@/src/app/api/admin/assets/route");
    const res = await GET(buildRequest("http://localhost/api/admin/assets"));
    expect(res.status).toBe(401);
  });

  it("returns active assets", async () => {
    const { GET } = await import("@/src/app/api/admin/assets/route");
    const res = await GET(buildRequest("http://localhost/api/admin/assets"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.assets).toHaveLength(1);
    expect(mockGetActiveAssets).toHaveBeenCalledTimes(1);
  });
});
