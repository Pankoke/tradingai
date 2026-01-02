import { describe, expect, it, vi } from "vitest";
import { loadThresholdRelaxationSimulation } from "@/src/server/admin/playbookThresholdSimulation";

vi.mock("@/src/server/repositories/setupOutcomeRepository", () => {
  const base = {
    profile: "SWING",
    timeframe: "1D",
    playbookId: "gold-swing-v0.2",
  };
  return {
    listOutcomesForWindow: async () => [
      { ...base, setupId: "s1", snapshotId: "snap1", biasScore: 85, signalQuality: 60, outcomeStatus: "hit_tp" },
      { ...base, setupId: "s2", snapshotId: "snap2", biasScore: 78, signalQuality: 54, outcomeStatus: "hit_sl" },
      { ...base, setupId: "s3", snapshotId: "snap3", biasScore: 72, signalQuality: 52, outcomeStatus: "expired" },
      { ...base, setupId: "s4", snapshotId: "snap4", biasScore: 68, signalQuality: 40, outcomeStatus: "open" },
    ],
  };
});

describe("threshold relaxation simulation", () => {
  it("computes baseline and grid deltas", async () => {
    const res = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80, 75],
      sqCandidates: [55],
    });

    expect(res.baseline.count).toBe(1); // only s1 passes 80/55
    const row75 = res.grid.find((r) => r.biasMin === 75 && r.sqMin === 55);
    expect(row75).toBeDefined();
    expect(row75?.eligibleCount).toBe(1); // sqMin=55: nur s1
  });
});
