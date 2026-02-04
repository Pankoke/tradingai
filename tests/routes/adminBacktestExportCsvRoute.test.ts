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

function buildRequest(url: string, method = "GET") {
  return new NextRequest(url, { method, headers: { host: "localhost" } });
}

describe("admin backtest export csv route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockIsAdminEnabled.mockReturnValue(true);
    mockIsAdminSession.mockReturnValue(true);
    mockValidateOrigin.mockReturnValue(true);
    mockGet.mockResolvedValue({
      runKey: "rk",
      assetId: "BTC",
      fromIso: "2026-01-01T00:00:00Z",
      toIso: "2026-01-02T00:00:00Z",
      stepHours: 4,
      trades: [
        {
          side: "long",
          entry: { iso: "2026-01-01T00:00:00Z", price: 100 },
          exit: { iso: "2026-01-01T04:00:00Z", price: 110 },
          barsHeld: 1,
          reason: "time-exit",
          pnl: { grossPnl: 10, fees: 1, slippage: 0.5, netPnl: 8.5 },
        },
      ],
      kpis: { trades: 1, wins: 1, losses: 0, winRate: 1, netPnl: 8.5, avgPnl: 8.5, maxDrawdown: 0 },
      costsConfig: { feeBps: 10, slippageBps: 5 },
      exitPolicy: { kind: "hold-n-steps", holdSteps: 3 },
    });
  });

  it("rejects when admin disabled", async () => {
    mockIsAdminEnabled.mockReturnValue(false);
    const { GET } = await import("@/src/app/api/admin/backtest/runs/[runKey]/export/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/runs/rk/export"), {
      params: Promise.resolve({ runKey: "rk" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns trades CSV", async () => {
    const { GET } = await import("@/src/app/api/admin/backtest/runs/[runKey]/export/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/runs/rk/export?type=trades"), {
      params: Promise.resolve({ runKey: "rk" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("runKey,assetId,side,entryIso");
    expect(text).toContain("rk,BTC,long,2026-01-01T00:00:00Z,100.000000");
    expect(mockGet).toHaveBeenCalledWith("rk");
  });

  it("returns kpis CSV", async () => {
    const { GET } = await import("@/src/app/api/admin/backtest/runs/[runKey]/export/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/runs/rk/export?type=kpis"), {
      params: Promise.resolve({ runKey: "rk" }),
    });
    const text = await res.text();
    expect(text).toContain("runKey,assetId,fromIso,toIso,stepHours");
    expect(text).toContain("rk,BTC,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z,4");
  });

  it("returns 404 when run missing", async () => {
    mockGet.mockResolvedValue(undefined);
    const { GET } = await import("@/src/app/api/admin/backtest/runs/[runKey]/export/route");
    const res = await GET(buildRequest("http://localhost/api/admin/backtest/runs/missing/export"), {
      params: Promise.resolve({ runKey: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});
