import { describe, expect, it, vi } from "vitest";
import { loadRecentSwingCandidates } from "@/src/server/services/outcomeEvaluationRunner";

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  listSnapshotsPaged: vi.fn(async () => ({
    snapshots: [
      {
        id: "snap1",
        snapshotTime: new Date(),
        setups: [
          {
            id: "s1",
            assetId: "GC=F",
            symbol: "GC=F",
            timeframe: "1D",
            profile: "SWING",
            entryZone: "1",
            stopLoss: "0.9",
            takeProfit: "1.1",
            setupPlaybookId: null,
          },
          {
            id: "s2",
            assetId: "GSPC",
            symbol: "^GSPC",
            timeframe: "1D",
            profile: "SWING",
            entryZone: "1",
            stopLoss: "0.9",
            takeProfit: "1.1",
            setupPlaybookId: null,
          },
        ],
      },
    ],
    total: 1,
  })),
}));

describe("outcomeEvaluationRunner playbook resolution", () => {
  it("resolves playbook when missing and matches family", async () => {
    const stats: { stored: number; resolved: number; incompatible: number } = { stored: 0, resolved: 0, incompatible: 0 };
    const candidates = await loadRecentSwingCandidates({
      playbookId: "gold-swing-v0.2",
      assetId: "gold",
      limit: 10,
      playbookMatchStats: stats,
      reasons: {},
    });
    expect(candidates.find((c) => c.id === "s1")).toBeTruthy();
    expect(stats.resolved).toBeGreaterThan(0);
  });

  it("rejects incompatible resolved playbook", async () => {
    const reasons: Record<string, number> = {};
    const stats: { stored: number; resolved: number; incompatible: number } = { stored: 0, resolved: 0, incompatible: 0 };
    const candidates = await loadRecentSwingCandidates({
      playbookId: "gold-swing-v0.2",
      assetId: "",
      limit: 10,
      playbookMatchStats: stats,
      reasons,
    });
    // s2 should be rejected by playbook mismatch
    expect(candidates.find((c) => c.id === "s2")).toBeUndefined();
    expect(reasons["playbook_mismatch"] ?? 0).toBeGreaterThan(0);
  });
});
