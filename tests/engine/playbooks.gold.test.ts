import { describe, expect, it } from "vitest";
import { resolvePlaybook, playbookTestExports } from "@/src/lib/engine/playbooks";
import type { EventModifier } from "@/src/lib/engine/types";

const { evaluateGoldSwing } = playbookTestExports;

const goldAsset = { id: "gold", symbol: "XAUUSD", name: "Gold Futures" };
const nonGoldAsset = { id: "fx-eur", symbol: "EURUSD", name: "Euro Dollar" };

const baseLevels = {
  entryZone: "100",
  stopLoss: "95",
  takeProfit: "110",
  riskReward: { riskPercent: 5, rewardPercent: 10, rrr: 2, volatilityLabel: "medium" },
};

const baseSignalQuality = { grade: "A", score: 80, labelKey: "ok", reasons: [] };

function makeModifier(minutesToEvent: number): EventModifier {
  return {
    classification: "execution_critical",
    primaryEvent: {
      minutesToEvent,
    },
  };
}

describe("gold swing playbook v0.2", () => {
  it("gives A when all bases are strong and neutral orderflow", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 90, trendScore: 82, sentimentScore: 70, orderflowScore: 55 },
      orderflow: { flags: ["neutral"] },
      eventModifier: null,
      signalQuality: baseSignalQuality,
      levels: baseLevels,
    });
    expect(result.setupGrade).toBe("A");
    expect(result.noTradeReason).toBeUndefined();
  });

  it("downgrades to B when orderflow is negative without hard knockout", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 95, trendScore: 70, sentimentScore: 70, orderflowScore: 25 },
      orderflow: { flags: ["risk", "sell pressure"] },
      eventModifier: null,
      signalQuality: baseSignalQuality,
      levels: baseLevels,
    });
    expect(result.setupGrade).toBe("B");
    expect(result.gradeRationale?.join(" ").toLowerCase()).toContain("downgraded");
    expect(result.debugReason).toContain("soft:orderflow_negative");
  });

  it("downgrades to B on soft trend/bias divergence", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 95, trendScore: 70, sentimentScore: 70, orderflowScore: 60 },
      orderflow: { flags: ["neutral"] },
      eventModifier: null,
      signalQuality: { grade: "A", score: 56, labelKey: "ok", reasons: [] },
      levels: baseLevels,
    });
    expect(result.setupGrade).toBe("B");
    expect(result.debugReason).toContain("trend_bias_divergence");
  });

  it("falls back to default playbook for non-gold assets", () => {
    const playbook = resolvePlaybook(nonGoldAsset, "swing");
    const result = playbook.evaluateSetup({
      asset: nonGoldAsset,
      profile: "swing",
      rings: { biasScore: 75, trendScore: 50, sentimentScore: 55, orderflowScore: 55 },
      orderflow: { flags: ["neutral"] },
      eventModifier: null,
      signalQuality: { grade: "B", score: 70, labelKey: "ok", reasons: [] },
    });
    expect(["B", "NO_TRADE"]).toContain(result.setupGrade);
  });

  it("returns NO_TRADE when basis fails (trend too weak)", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 90, trendScore: 40, sentimentScore: 70, orderflowScore: 60 },
      eventModifier: null,
      signalQuality: baseSignalQuality,
      levels: baseLevels,
    });
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toLowerCase()).toContain("trend");
    expect(result.debugReason).toContain("base:trend");
  });

  it("treats orderflow conflict + negative as soft downgrade (no hard KO)", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 90, trendScore: 70, sentimentScore: 70, orderflowScore: 20 },
      orderflow: { flags: ["orderflow_trend_conflict"] },
      eventModifier: null,
      signalQuality: { grade: "B", score: 60, labelKey: "ok", reasons: [] },
      levels: baseLevels,
    });
    expect(result.setupGrade).toBe("B");
    expect(result.debugReason).toContain("orderflow_conflict");
  });

  it("grades B when just above relaxed thresholds", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 66, trendScore: 46, sentimentScore: 60, orderflowScore: 55 },
      orderflow: { flags: ["neutral"] },
      eventModifier: null,
      signalQuality: baseSignalQuality,
      levels: baseLevels,
    });
    expect(result.setupGrade).toBe("B");
    expect(result.noTradeReason).toBeUndefined();
  });

  it("stays NO_TRADE when below relaxed thresholds", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 64, trendScore: 46, sentimentScore: 60, orderflowScore: 55 },
      orderflow: { flags: ["neutral"] },
      eventModifier: null,
      signalQuality: baseSignalQuality,
      levels: baseLevels,
    });
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toLowerCase() ?? "").toContain("bias");
  });

  it("returns NO_TRADE when levels are missing", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 90, trendScore: 70, sentimentScore: 70, orderflowScore: 60 },
      orderflow: { flags: ["neutral"] },
      eventModifier: null,
      signalQuality: baseSignalQuality,
      levels: { ...baseLevels, takeProfit: null },
    });
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toLowerCase()).toContain("levels");
  });
});
