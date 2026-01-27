import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockBuild = vi.fn();
const mockAudit = vi.fn();
const mockDbExecute = vi.fn();
const mockGate = vi.fn();
const mockAssets = vi.fn();

vi.mock("@/src/features/perception/build/buildSetups", () => ({
  buildAndStorePerceptionSnapshot: (...args: unknown[]) => mockBuild(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockAudit(...args),
}));

vi.mock("@/src/server/db/db", () => ({
  db: { execute: (...args: unknown[]) => mockDbExecute(...args) },
}));

vi.mock("@/src/server/health/freshnessGate", () => ({
  gateCandlesPerAsset: (...args: unknown[]) => mockGate(...args),
}));

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getActiveAssets: (...args: unknown[]) => mockAssets(...args),
}));

describe("POST /api/cron/perception/intraday", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mockDbExecute.mockReset();
    mockGate.mockReset();
    mockAssets.mockReset();
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("requires auth", async () => {
    const { POST } = await import("@/src/app/api/cron/perception/intraday/route");
    const req = new NextRequest("http://localhost/api/cron/perception/intraday", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
  });

  it("builds intraday-only snapshot with allowSync disabled", async () => {
    mockDbExecute.mockResolvedValueOnce([{ locked: true }]).mockResolvedValueOnce([]);
    mockAssets.mockResolvedValue([{ id: "btc" }]);
    mockGate.mockResolvedValue({
      perAsset: [
        {
          assetId: "btc",
          results: [
            { timeframe: "1H", status: "ok" },
            { timeframe: "4H", status: "ok" },
          ],
        },
      ],
    });
    mockBuild.mockResolvedValue({
      snapshot: { id: "snap-1", setups: [{ id: "s1" }] },
    });
    const { POST } = await import("@/src/app/api/cron/perception/intraday/route");
    const req = new NextRequest("http://localhost/api/cron/perception/intraday", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        profiles: ["INTRADAY"],
        allowSync: false,
        source: "cron_intraday",
      }),
    );
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "perception_intraday", ok: true }));
  });
});
