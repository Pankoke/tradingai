import { describe, expect, it } from "vitest";
import { loadGoldThresholdSuggestions } from "@/src/server/admin/playbookThresholdSuggestions";

vi.mock("@/src/server/repositories/setupOutcomeRepository", () => {
  const base = {
    profile: "SWING",
    timeframe: "1D",
    assetId: "gold",
    snapshotId: "snap",
  };
  return {
    listOutcomesForWindow: async () => [
      { ...base, setupId: "s1", setupGrade: "NO_TRADE", noTradeReason: "Bias too weak (<70)", biasScore: 70, outcomeStatus: "open" },
      { ...base, setupId: "s2", setupGrade: "NO_TRADE", noTradeReason: "Trend weak (<50)", trendScore: 40, outcomeStatus: "open" },
      { ...base, setupId: "s3", setupGrade: "NO_TRADE", noTradeReason: "Bias too weak (<70)", biasScore: 75, outcomeStatus: "open" },
      { ...base, setupId: "s4", setupGrade: "A", outcomeStatus: "hit_tp" },
    ],
  };
});

describe("playbook threshold suggestions", () => {
  it("parses reasons and builds suggestions", async () => {
    const res = await loadGoldThresholdSuggestions({ days: 30, percentile: 0.7 });
    expect(res.meta.totalOutcomes).toBe(4);
    expect(res.topNoTradeReasons.length).toBeGreaterThan(0);
    expect(res.suggestions.find((s) => s.metric === "biasScore")).toBeDefined();
  });
});
