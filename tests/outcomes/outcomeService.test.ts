import { describe, expect, it, vi } from "vitest";

const mockList = vi.fn();
const mockGet = vi.fn();

vi.mock("@/src/server/repositories/setupOutcomeRepository", () => ({
  listOutcomesForWindow: (...args: unknown[]) => mockList(...args),
}));

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getAssetById: (...args: unknown[]) => mockGet(...args),
}));

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  getSnapshotById: async () => ({
    id: "snap1",
    setups: [
      { id: "s1", setupGrade: "A", setupType: "pullback_continuation", rings: {}, eventModifier: null },
    ],
  }),
  listSnapshotItems: async () => [],
}));

describe("outcomeService filters by playbook", () => {
  it("passes playbookId to repository", async () => {
    mockList.mockResolvedValueOnce([
      {
        id: "o1",
        setupId: "s1",
        snapshotId: "snap1",
        assetId: "gold",
        profile: "SWING",
        timeframe: "1D",
        direction: "Long",
        playbookId: "gold-swing-v0.2",
        setupGrade: "A",
        setupType: "pullback_continuation",
        gradeRationale: ["Bias strong"],
        noTradeReason: null,
        gradeDebugReason: null,
        evaluatedAt: new Date("2025-01-01T00:00:00Z"),
        windowBars: 10,
        outcomeStatus: "hit_tp",
        outcomeAt: new Date("2025-01-02T00:00:00Z"),
        barsToOutcome: 1,
        reason: null,
      },
    ]);

    const { loadOutcomeStats, loadOutcomeExportRows } = await import("@/src/server/admin/outcomeService");
    await loadOutcomeStats({ playbookId: "gold-swing-v0.2" });
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ playbookId: "gold-swing-v0.2" }));

    mockList.mockResolvedValueOnce([
      {
        id: "o1",
        setupId: "s1",
        snapshotId: "snap1",
        assetId: "gold",
        profile: "SWING",
        timeframe: "1D",
        direction: "Long",
        playbookId: "gold-swing-v0.2",
        setupGrade: "A",
        setupType: "pullback_continuation",
        gradeRationale: ["Bias strong"],
        noTradeReason: null,
        gradeDebugReason: null,
        evaluatedAt: new Date("2025-01-01T00:00:00Z"),
        windowBars: 10,
        outcomeStatus: "hit_tp",
        outcomeAt: new Date("2025-01-02T00:00:00Z"),
        barsToOutcome: 1,
        reason: null,
      },
    ]);
    await loadOutcomeExportRows({ playbookId: "gold-swing-v0.2" });
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ playbookId: "gold-swing-v0.2" }));
  });

  it("returns available playbooks from cohort", async () => {
    mockList.mockResolvedValueOnce([
      {
        id: "o1",
        setupId: "s1",
        snapshotId: "snap1",
        assetId: "gold",
        profile: "SWING",
        timeframe: "1D",
        direction: "Long",
        playbookId: "gold-swing-v0.2",
        setupGrade: "A",
        setupType: "pullback_continuation",
        gradeRationale: ["Bias strong"],
        noTradeReason: null,
        gradeDebugReason: null,
        evaluatedAt: new Date("2025-01-01T00:00:00Z"),
        windowBars: 10,
        outcomeStatus: "hit_tp",
        outcomeAt: new Date("2025-01-02T00:00:00Z"),
        barsToOutcome: 1,
        reason: null,
      },
      {
        id: "o2",
        setupId: "s2",
        snapshotId: "snap2",
        assetId: "spx",
        profile: "SWING",
        timeframe: "1D",
        direction: "Long",
        playbookId: "metals-swing-v0.1",
        setupGrade: "B",
        setupType: "range_break",
        gradeRationale: null,
        noTradeReason: null,
        gradeDebugReason: null,
        evaluatedAt: new Date("2025-01-03T00:00:00Z"),
        windowBars: 10,
        outcomeStatus: "open",
        outcomeAt: null,
        barsToOutcome: null,
        reason: null,
      },
    ]);

    const { loadOutcomeStats } = await import("@/src/server/admin/outcomeService");
    const stats = await loadOutcomeStats({ days: 30 });
    expect(stats.availablePlaybooks.sort()).toEqual(["gold-swing-v0.2", "metals-swing-v0.1"]);
  });
});
