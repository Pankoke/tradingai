import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequestSnapshotBuild = vi.fn();
const mockCreateAuditRun = vi.fn();

vi.mock("@/src/server/perception/snapshotBuildService", () => ({
  requestSnapshotBuild: (...args: unknown[]) => mockRequestSnapshotBuild(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockCreateAuditRun(...args),
}));

describe("GET /api/cron/perception", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "secret-token";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 200 with ok payload when secret matches", async () => {
    const snapshotTime = new Date("2025-01-01T00:00:00Z");
    mockRequestSnapshotBuild.mockResolvedValue({
      snapshot: {
        snapshot: {
          id: "snap-1",
          snapshotTime,
          setups: [],
        },
      },
      reused: false,
    });
    const { GET } = await import("@/src/app/api/cron/perception/route");
    const req = new NextRequest("http://localhost/api/cron/perception", {
      headers: { authorization: "Bearer secret-token" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload).toEqual({
      ok: true,
      data: { generatedAt: snapshotTime.toISOString(), totalSetups: 0 },
    });
    expect(mockCreateAuditRun).toHaveBeenCalledWith(
      expect.objectContaining({ action: "snapshot_build", source: "cron", ok: true }),
    );
  });

  it("returns 401 when secret missing", async () => {
    const { GET } = await import("@/src/app/api/cron/perception/route");
    const req = new NextRequest("http://localhost/api/cron/perception");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });
});
