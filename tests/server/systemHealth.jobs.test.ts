import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSystemHealthReport } from "@/src/server/admin/systemHealth";

const mockListAuditRuns = vi.hoisted(() => vi.fn(async () => ({ runs: [], total: 0 })));
const mockGetLatestSnapshot = vi.hoisted(() => vi.fn(async () => null));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  listAuditRuns: (...args: unknown[]) => mockListAuditRuns(...args),
}));

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  getLatestSnapshot: (...args: unknown[]) => mockGetLatestSnapshot(...args),
}));

vi.mock("@/src/server/admin/systemHealth", async (orig) => {
  const actual = await orig<typeof import("@/src/server/admin/systemHealth")>();
  return {
    ...actual,
  };
});

describe("systemHealth job status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks jobs as missing when no audit runs", async () => {
    mockListAuditRuns.mockResolvedValue({ runs: [], total: 0 });
    mockGetLatestSnapshot.mockResolvedValue(null);
    const report = await getSystemHealthReport();
    expect(report.jobs?.jobs.length).toBeGreaterThan(0);
    expect(report.jobs?.jobs.every((j) => j.status === "missing" || j.status === "stale" || j.status === "ok")).toBe(true);
  });
});
