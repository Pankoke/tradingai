import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCompute = vi.fn();
const mockAudit = vi.fn();

vi.mock("@/src/features/bias/computeTechnicalBias", () => ({
  computeTechnicalBiasForAllActiveAssets: (...args: unknown[]) => mockCompute(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockAudit(...args),
}));

describe("POST /api/cron/bias/sync", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns ok when authorized", async () => {
    mockCompute.mockResolvedValue({ processed: 3, skipped: 1 });
    const { POST } = await import("@/src/app/api/cron/bias/sync/route");
    const req = new NextRequest("http://localhost/api/cron/bias/sync", {
      headers: { authorization: "Bearer cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.processed).toBe(3);
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "bias_sync", ok: true }));
  });

  it("rejects when unauthorized", async () => {
    const { POST } = await import("@/src/app/api/cron/bias/sync/route");
    const req = new NextRequest("http://localhost/api/cron/bias/sync");
    const res = await POST(req);
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });
});
