import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIsAdminEnabled = vi.fn();
const mockIsAdminSession = vi.fn();
const mockValidateOrigin = vi.fn();
const mockGet = vi.fn();

vi.mock("@/src/lib/admin/security", () => ({
  isAdminEnabled: () => mockIsAdminEnabled(),
  validateAdminRequestOrigin: () => mockValidateOrigin(),
}));

vi.mock("@/src/lib/admin/auth", () => ({
  isAdminSessionFromRequest: () => mockIsAdminSession(),
}));

vi.mock("@/src/server/repositories/backtestRunRepository", () => ({
  getBacktestRunByKey: (...args: unknown[]) => mockGet(...args),
}));

function buildRequest(url: string) {
  return new NextRequest(url, {
    method: "GET",
    headers: { host: "localhost", authorization: "Bearer cron-secret", "x-cron-secret": "cron-secret" },
  });
}

const runA = {
  runKey: "A",
  assetId: "BTC",
  fromIso: "2026-01-01T00:00:00Z",
  toIso: "2026-01-02T00:00:00Z",
  stepHours: 4,
  kpis: { trades: 2, wins: 1, losses: 1, winRate: 0.5, netPnl: 1.5, avgPnl: 0.75, maxDrawdown: 0.5 },
  costsConfig: { feeBps: 1, slippageBps: 2 },
  exitPolicy: { kind: "hold-n-steps", holdSteps: 3 },
  trades: [
    { reason: "time-exit", pnl: { netPnl: 1 } },
    { reason: "end-of-range", pnl: { netPnl: -1 } },
  ],
};

const runB = {
  runKey: "B",
  assetId: "ETH",
  fromIso: "2026-01-03T00:00:00Z",
  toIso: "2026-01-04T00:00:00Z",
  stepHours: 4,
  kpis: { trades: 3, wins: 2, losses: 1, winRate: 0.6667, netPnl: 3, avgPnl: 1, maxDrawdown: 0.4 },
  costsConfig: { feeBps: 2, slippageBps: 3 },
  exitPolicy: { kind: "hold-n-steps", holdSteps: 4 },
  trades: [
    { reason: "time-exit", pnl: { netPnl: 2 } },
    { reason: "end-of-range", pnl: { netPnl: 1 } },
    { reason: "time-exit", pnl: { netPnl: 0 } },
  ],
};

describe("admin backtest compare export csv route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    process.env.ADMIN_API_TOKEN = "admin-secret";
    mockIsAdminEnabled.mockReturnValue(true);
    mockIsAdminSession.mockReturnValue(true);
    mockValidateOrigin.mockReturnValue(true);
    mockGet.mockImplementation((key: string) => {
      if (key === "A") return runA;
      if (key === "B") return runB;
      return undefined;
    });
  });

  it("rejects unauthorized", async () => {
    mockIsAdminSession.mockReturnValue(false);
    const { GET } = await import("@/src/app/api/admin/backtest/compare/export/route");
    const res = await GET(
      new NextRequest("http://localhost/api/admin/backtest/compare/export?primary=A&secondary=B", { method: "GET" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects when origin invalid in admin mode", async () => {
    mockValidateOrigin.mockReturnValue(false);
    const { GET } = await import("@/src/app/api/admin/backtest/compare/export/route");
    const res = await GET(
      new NextRequest("http://localhost/api/admin/backtest/compare/export?primary=A&secondary=B", {
        method: "GET",
        headers: { authorization: "Bearer admin-secret" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("allows cron mode without origin", async () => {
    const { GET } = await import("@/src/app/api/admin/backtest/compare/export/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/compare/export?primary=A&secondary=B"));
    expect(res.status).toBe(200);
  });

  it("requires params", async () => {
    const { GET } = await import("@/src/app/api/admin/backtest/compare/export/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/compare/export"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when run missing", async () => {
    mockGet.mockResolvedValueOnce(undefined);
    const { GET } = await import("@/src/app/api/admin/backtest/compare/export/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/compare/export?primary=X&secondary=B"));
    expect(res.status).toBe(404);
  });

  it("returns KPI CSV with correct headers and order", async () => {
    const { GET } = await import("@/src/app/api/admin/backtest/compare/export/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/compare/export?primary=A&secondary=B&type=kpis"));
    expect(res.status).toBe(200);
    const text = await res.text();
    const firstLine = text.split("\n")[0];
    expect(firstLine).toBe("metric,a,b,delta");
    expect(text).toContain("trades,2.000000,3.000000,1.000000");
    expect(text).toContain("winRate_pct,50.00,66.67,16.67");
  });
});
