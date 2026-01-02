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
      { ...base, setupId: "s1", snapshotId: "snap1", outcomeStatus: "hit_tp" },
      { ...base, setupId: "s2", snapshotId: "snap1", outcomeStatus: "hit_sl" },
      { ...base, setupId: "s3", snapshotId: "snap1", outcomeStatus: "expired" },
      { ...base, setupId: "s4", snapshotId: "snap1", outcomeStatus: "open" },
    ],
  };
});

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  getSnapshotById: async () => ({
    id: "snap1",
    setups: [
      { id: "s1", rings: { biasScore: 85, signalQuality: 60, confidenceScore: 70 }, signalQuality: { score: 60 } },
      { id: "s2", rings: { biasScore: 78, signalQuality: 54, confidenceScore: 65 }, signalQuality: { score: 54 } },
      { id: "s3", rings: { biasScore: 72, signalQuality: 52, confidenceScore: 60 }, signalQuality: { score: 52 } },
      { id: "s4", rings: { biasScore: 68, signalQuality: 40, confidenceScore: 50 }, signalQuality: { score: 40 } },
    ],
  }),
}));

describe("threshold relaxation simulation", () => {
  it("computes baseline and grid deltas", async () => {
    const res = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80, 75],
      sqCandidates: [55],
      debug: true,
    });

    expect(res.baseline.count).toBe(1); // only s1 passes 80/55
    const row75 = res.grid.find((r) => r.biasMin === 75 && r.sqMin === 55);
    expect(row75).toBeDefined();
    expect(row75?.eligibleCount).toBe(1); // sqMin=55: nur s1
  });

  it("computes percentiles correctly", async () => {
    const stats = (await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80],
      sqCandidates: [55],
      debug: true,
    })) as any;
    const biasStats = stats.debug.metrics.biasScore;
    expect(biasStats.p50).toBe(76);
    expect(biasStats.p90).toBeGreaterThan(60);
  });
});
