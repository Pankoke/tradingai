import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAudit = vi.fn();
vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockAudit(...args),
}));

const mockCounts = {
  candles: 10,
  perceptionSnapshotItems: 20,
  biasSnapshots: 5,
  eventsHigh: 2,
  eventsLow: 4,
  auditRuns: 1,
};

vi.mock("@/src/server/repositories/cleanupRepository", () => ({
  countOldCandles: () => Promise.resolve(mockCounts.candles),
  countOldPerceptionSnapshotItems: () => Promise.resolve(mockCounts.perceptionSnapshotItems),
  countOldBiasSnapshots: () => Promise.resolve(mockCounts.biasSnapshots),
  countOldEvents: () => Promise.resolve({ high: mockCounts.eventsHigh, low: mockCounts.eventsLow }),
  countOldAuditRuns: () => Promise.resolve(mockCounts.auditRuns),
}));

describe("POST /api/cron/cleanup", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns counts when authorized", async () => {
    const { POST } = await import("@/src/app/api/cron/cleanup/route");
    const req = new NextRequest("http://localhost/api/cron/cleanup", {
      headers: { authorization: "Bearer secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.countsByTable).toEqual(mockCounts);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "cleanup.dry_run",
        ok: true,
        meta: expect.objectContaining({
          countsByTable: mockCounts,
        }),
      }),
    );
  });

  it("returns unauthorized without secret", async () => {
    const { POST } = await import("@/src/app/api/cron/cleanup/route");
    const req = new NextRequest("http://localhost/api/cron/cleanup");
    const res = await POST(req);
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });
});
