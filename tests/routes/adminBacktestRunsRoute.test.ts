import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIsAdminEnabled = vi.fn();
const mockIsAdminSession = vi.fn();
const mockValidateOrigin = vi.fn();
const mockList = vi.fn();
const mockGet = vi.fn();
const mockRunBacktest = vi.fn();

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

vi.mock("@/src/server/backtest/runBacktest", () => ({
  runBacktest: (...args: unknown[]) => mockRunBacktest(...args),
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

  it("run route passes fee/slippage/holdSteps", async () => {
    mockRunBacktest.mockResolvedValue({ ok: true, reportPath: "x", steps: 1 });
    const { POST } = await import("@/src/app/api/admin/backtest/run/route");
    const body = {
      assetId: "btc",
      fromIso: "2026-01-01T00:00:00Z",
      toIso: "2026-01-02T00:00:00Z",
      stepHours: 4,
      feeBps: 10,
      slippageBps: 20,
      holdSteps: 5,
    };
    const req = new NextRequest("http://localhost/api/admin/backtest/run", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockRunBacktest).toHaveBeenCalledWith(
      expect.objectContaining({
        costsConfig: { feeBps: 10, slippageBps: 20 },
        exitPolicy: { kind: "hold-n-steps", holdSteps: 5, price: "step-open" },
      }),
    );
  });
});
