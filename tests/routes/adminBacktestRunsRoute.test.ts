import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIsAdminEnabled = vi.fn();
const mockIsAdminSession = vi.fn();
const mockValidateOrigin = vi.fn();
const mockList = vi.fn();
const mockGet = vi.fn();

vi.mock("@/src/lib/admin/security", () => ({
  isAdminEnabled: () => mockIsAdminEnabled(),
  validateAdminRequestOrigin: () => mockValidateOrigin(),
}));

vi.mock("@/src/lib/admin/auth", () => ({
  isAdminSessionFromRequest: () => mockIsAdminSession(),
}));

vi.mock("@/src/server/repositories/backtestRunRepository", () => ({
  listRecentBacktestRunsMeta: (...args: unknown[]) => mockList(...args),
  getBacktestRunByKey: (...args: unknown[]) => mockGet(...args),
}));

function buildRequest(url: string, method = "GET") {
  return new NextRequest(url, { method });
}

describe("admin backtest runs routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsAdminEnabled.mockReturnValue(true);
    mockIsAdminSession.mockReturnValue(true);
    mockValidateOrigin.mockReturnValue(true);
    mockList.mockResolvedValue([{ runKey: "rk", assetId: "BTC", stepHours: 4 }]);
    mockGet.mockResolvedValue({ runKey: "rk", assetId: "BTC", stepHours: 4 });
  });

  it("rejects when admin disabled", async () => {
    mockIsAdminEnabled.mockReturnValue(false);
    const { GET } = await import("@/src/app/api/admin/backtest/runs/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/runs"));
    expect(res.status).toBe(404);
  });

  it("lists runs when authorized", async () => {
    const { GET } = await import("@/src/app/api/admin/backtest/runs/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/runs?limit=2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.runs).toHaveLength(1);
    expect(mockList).toHaveBeenCalledWith(2);
  });

  it("returns detail by runKey", async () => {
    const { GET } = await import("@/src/app/api/admin/backtest/runs/[runKey]/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/runs/rk"), { params: { runKey: "rk" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.run.runKey).toBe("rk");
    expect(mockGet).toHaveBeenCalledWith("rk");
  });

  it("detail returns 404 when missing", async () => {
    mockGet.mockResolvedValue(undefined);
    const { GET } = await import("@/src/app/api/admin/backtest/runs/[runKey]/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/runs/absent"), { params: { runKey: "absent" } });
    expect(res.status).toBe(404);
  });
});
