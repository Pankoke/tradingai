import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRun = vi.fn();
const mockAudit = vi.fn();
const mockLatestSnapshot = vi.fn();
const mockGate = vi.fn();
const mockActiveAssets = vi.fn();

vi.mock("@/src/server/services/outcomeEvaluationRunner", () => ({
  runOutcomeEvaluationBatch: (...args: unknown[]) => mockRun(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockAudit(...args),
}));

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  getLatestSnapshot: (...args: unknown[]) => mockLatestSnapshot(...args),
}));

vi.mock("@/src/server/health/freshnessGate", () => ({
  gateCandlesPerAsset: (...args: unknown[]) => mockGate(...args),
}));

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getActiveAssets: (...args: unknown[]) => mockActiveAssets(...args),
}));

describe("POST /api/cron/outcomes/evaluate", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mockLatestSnapshot.mockResolvedValue({
      snapshot: { snapshotTime: new Date().toISOString() },
      setups: [{ assetId: "gold" }],
    });
    mockGate.mockResolvedValue({ allOk: true, staleAssets: [], missingAssets: [] });
    mockActiveAssets.mockResolvedValue([{ id: "gold" }]);
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("requires auth", async () => {
    const { POST } = await import("@/src/app/api/cron/outcomes/evaluate/route");
    const req = new NextRequest("http://localhost/api/cron/outcomes/evaluate", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("runs evaluation and returns metrics", async () => {
    mockRun.mockResolvedValue({
      metrics: { evaluated: 1, hit_tp: 1, hit_sl: 0, expired: 0, ambiguous: 0, still_open: 0, errors: 0, skippedClosed: 0 },
      processed: 1,
      reasons: {},
      stats: { snapshots: 1, extractedSetups: 1, eligible: 1, skippedClosed: 0 },
      sampleSetupIds: [],
    });
    const { POST } = await import("@/src/app/api/cron/outcomes/evaluate/route");
    const req = new NextRequest("http://localhost/api/cron/outcomes/evaluate?daysBack=7&limit=5&dryRun=true", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.metrics.evaluated).toBe(1);
    expect(mockRun).toHaveBeenCalledWith(expect.objectContaining({ daysBack: 7, limit: 5, dryRun: true }));
    expect(mockAudit).toHaveBeenCalled();
  });
});
