import { describe, expect, it, vi } from "vitest";
import { loadThresholdRelaxationSimulation } from "@/src/server/admin/playbookThresholdSimulation";
import { pickRecommendation, recommendThresholdV2, type SimulationGridRow } from "@/src/lib/admin/thresholdSimulate";

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
      { ...base, setupId: "s3", snapshotId: "snap1", outcomeStatus: "expired", setupGrade: "NO_TRADE", noTradeReason: "Bias too weak (<70)" },
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
    const row = res.grid.find((r) => r.sqMin === 55);
    expect(row).toBeDefined();
    expect(row?.eligibleCount).toBe(1); // sqMin=55: nur s1
  });

  it("computes percentiles correctly", async () => {
    const stats = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80],
      sqCandidates: [55],
      debug: true,
    });
    const biasStats = stats.debug?.metrics.biasScore;
    expect(biasStats?.p50).toBe(77);
    expect((biasStats?.p90 ?? 0)).toBeGreaterThan(60);
  });

  it("ignores bias gating (SQ-only)", async () => {
    const res = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [90, 50],
      sqCandidates: [50],
      debug: true,
    });

    const rowSq = res.grid.find((r) => r.sqMin === 50);
    expect(rowSq?.eligibleCount).toBe(2); // s1,s2 pass SQ >=50 (NO_TRADE excluded)
    expect(res.meta.biasGateEnabled).toBe(false);
    expect(rowSq?.kpis.closedTotal).toBeGreaterThan(0);
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
    expect(withNoTrade.meta.population?.noTradeReasonCounts?.["Bias too weak (<70)"]).toBe(1);
  });

  it("generates default SQ grid and kpis when sq missing", async () => {
    const res = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80],
      debug: true,
    });
    const rowsSq = res.grid.filter((r) => r.sqMin !== undefined);
    expect(rowsSq.length).toBeGreaterThan(1);
    const first = rowsSq[0];
    expect(first.kpis).toBeDefined();
    expect(first.kpis.utilityScore).toBeTypeOf("number");
  });

  it("applies confidence gate only when useConf=1 and exposes confMin", async () => {
    const withConf = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80],
      sqCandidates: [50],
      confCandidates: [65],
      useConf: true,
      debug: true,
    });
    const rowConf = withConf.grid.find((r) => r.confMin === 65 && r.sqMin === 50);
    expect(rowConf).toBeDefined();
    expect(rowConf?.eligibleCount).toBe(2); // confidence 70/65 pass 65
    expect(withConf.debug?.metrics.confidenceScore?.countMissing).toBe(0);

    const withoutConf = await loadThresholdRelaxationSimulation({
      days: 30,
      playbookId: "gold-swing-v0.2",
      biasCandidates: [80],
      sqCandidates: [50],
      confCandidates: [65],
      useConf: false,
    });
    const rowSqOnly = withoutConf.grid.find((r) => r.sqMin === 50 && r.confMin === undefined);
    expect(rowSqOnly?.eligibleCount).toBe(2); // confidence not gating
  });

  it("pickRecommendation respects guardrails", () => {
    const rows: SimulationGridRow[] = [
      {
        biasMin: 0,
        eligibleCount: 0,
        delta: 0,
        closedCounts: { hit_tp: 0, hit_sl: 0, expired: 0, ambiguous: 0, open: 0 },
        kpis: { utilityScore: 80, closedTotal: 5, hitRate: 0, expiryRate: 0, winLoss: 0 },
      },
      {
        biasMin: 0,
        eligibleCount: 0,
        delta: 0,
        closedCounts: { hit_tp: 2, hit_sl: 0, expired: 0, ambiguous: 0, open: 0 },
        kpis: { utilityScore: 50, closedTotal: 30, hitRate: 0, expiryRate: 0, winLoss: 0 },
      },
    ];
    const rec = pickRecommendation(rows, { minClosedTotal: 20, minHits: 1 });
    expect(rec.row).toBe(rows[1]);
    expect(rec.label).toBe("Recommended");
  });

  it("recommendThresholdV2 selects valid candidate and alternatives", () => {
    const rows: SimulationGridRow[] = [
      {
        sqMin: 50,
        biasMin: 0,
        eligibleCount: 0,
        delta: 0,
        closedCounts: { hit_tp: 5, hit_sl: 5, expired: 0, ambiguous: 0, open: 0 },
        kpis: { utilityScore: 40, closedTotal: 10, hitRate: 0.5, expiryRate: 0, winLoss: 1 },
      },
      {
        sqMin: 55,
        biasMin: 0,
        eligibleCount: 0,
        delta: 0,
        closedCounts: { hit_tp: 2, hit_sl: 1, expired: 0, ambiguous: 0, open: 0 },
        kpis: { utilityScore: 60, closedTotal: 3, hitRate: 0.66, expiryRate: 0, winLoss: 2 },
      },
      {
        sqMin: 60,
        biasMin: 0,
        eligibleCount: 0,
        delta: 0,
        closedCounts: { hit_tp: 1, hit_sl: 0, expired: 0, ambiguous: 0, open: 0 },
        kpis: { utilityScore: 80, closedTotal: 1, hitRate: 1, expiryRate: 0, winLoss: 1 },
      },
    ];
    const baselineCounts = { hit_tp: 0, hit_sl: 0, expired: 0, ambiguous: 0, open: 0 };
    const rec = recommendThresholdV2(rows, baselineCounts, { minClosedTotal: 2, minHits: 1 });
    expect(rec.primary?.row.sqMin).toBe(55); // best balance by adjusted utility with samples
    expect(rec.alternatives.length).toBeGreaterThanOrEqual(0);
  });
});
