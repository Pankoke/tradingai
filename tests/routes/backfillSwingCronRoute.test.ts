import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockBuild = vi.fn();
const mockGet = vi.fn();
const mockAudit = vi.fn();

vi.mock("@/src/features/perception/build/buildSetups", () => ({
  buildAndStorePerceptionSnapshot: (...args: unknown[]) => mockBuild(...args),
}));

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  findSnapshotByDayAndLabel: (...args: unknown[]) => mockGet(...args),
  deleteSnapshotsByDayAndLabel: vi.fn(),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockAudit(...args),
}));

describe("POST /api/cron/snapshots/backfillSwing", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("rebuilds an existing snapshot when force=1", async () => {
    mockGet.mockResolvedValueOnce({
      snapshot: { id: "snap-existing", snapshotTime: new Date() },
      items: [],
      setups: [],
    });
    mockBuild.mockResolvedValue({ setups: [] });
    const { POST } = await import("@/src/app/api/cron/snapshots/backfillSwing/route");
    const req = new NextRequest(
      "http://localhost/api/cron/snapshots/backfillSwing?days=0&force=1",
      { method: "POST", headers: { authorization: "Bearer cron-secret" } },
    );

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.rebuilt).toBe(1);
    expect(body.data.skipped).toBe(0);
    expect(mockBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "cron",
        allowSync: false,
        profiles: ["SWING"],
        assetFilter: undefined,
      }),
    );
    expect(mockAudit).toHaveBeenCalled();
  });
});
