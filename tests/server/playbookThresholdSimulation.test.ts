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
      { ...base, setupId: "s1", snapshotId: "snap1", outcomeStatus: "hit_tp", setupGrade: "A" },
      { ...base, setupId: "s2", snapshotId: "snap1", outcomeStatus: "hit_sl", setupGrade: "B" },
      { ...base, setupId: "s3", snapshotId: "snap1", outcomeStatus: "expired", setupGrade: "NO_TRADE", noTradeReason: "Bias too weak (<80)" },
      { ...base, setupId: "s4", snapshotId: "snap1", outcomeStatus: "open", setupGrade: "A" },
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
    expect(biasStats.p50).toBe(77);
    expect(biasStats.p90).toBeGreaterThan(60);
  });

  it("ignores bias gating (SQ-only)", async () => {
    const res = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [90, 50],
      sqCandidates: [50],
      debug: true,
    });

    const row90 = res.grid.find((r) => r.biasMin === 90 && r.sqMin === 50);
    const row50 = res.grid.find((r) => r.biasMin === 50 && r.sqMin === 50);
    expect(row90?.eligibleCount).toBe(row50?.eligibleCount);
    expect(row90?.eligibleCount).toBe(2); // s1,s2 pass SQ >=50 (NO_TRADE excluded)
    expect(res.meta.biasGateEnabled).toBe(false);
  });

  it("respects limit param and reports capping", async () => {
    const res = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80],
      sqCandidates: [40],
      limit: 2,
    });
    expect(res.meta.limitUsed).toBe(2);
    expect(res.meta.isCapped).toBe(true);
    expect(res.meta.totalOutcomes).toBe(2);
  });

  it("filters closedOnly when requested", async () => {
    const res = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80],
      sqCandidates: [50],
      closedOnly: true,
    });
    expect(res.meta.totalOutcomes).toBe(2); // open + NO_TRADE excluded by default
    expect(res.baseline.closedCounts.open).toBe(0);
  });

  it("includeNoTrade toggles population", async () => {
    const without = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80],
      sqCandidates: [50],
    });
    const withNoTrade = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80],
      sqCandidates: [50],
      includeNoTrade: true,
    });
    expect(withNoTrade.meta.totalOutcomes).toBeGreaterThan(without.meta.totalOutcomes);
    expect(withNoTrade.meta.population?.includedNoTrade).toBe(1);
    expect(without.meta.population?.excludedNoTrade).toBe(1);
  });
});
