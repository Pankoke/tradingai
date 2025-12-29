import { describe, expect, it } from "vitest";
import { resolvePlaybook, playbookTestExports } from "@/src/lib/engine/playbooks";
import type { EventModifier } from "@/src/lib/engine/types";

const { evaluateGoldSwing } = playbookTestExports;

const goldAsset = { id: "gold", symbol: "XAUUSD", name: "Gold Futures" };
const nonGoldAsset = { id: "fx-eur", symbol: "EURUSD", name: "Euro Dollar" };

function makeModifier(minutesToEvent: number): EventModifier {
  return {
    classification: "execution_critical",
    primaryEvent: {
      minutesToEvent,
    },
  };
}

describe("gold swing playbook v0.2", () => {
  it("does not give A when orderflow is negative even if bias strong", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 95, trendScore: 70, sentimentScore: 70, orderflowScore: 35 },
      orderflow: { flags: ["risk", "sell pressure"] },
      eventModifier: null,
      signalQuality: { grade: "A", score: 90, labelKey: "ok", reasons: [] },
    });
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toLowerCase()).toContain("orderflow");
  });

  it("grants A with neutral orderflow when bias/trend strong and no execution critical", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 92, trendScore: 68, sentimentScore: 65, orderflowScore: 48 },
      orderflow: { flags: ["neutral"] },
      eventModifier: null,
      signalQuality: { grade: "A", score: 80, labelKey: "ok", reasons: [] },
    });
    expect(result.setupGrade).toBe("A");
    expect(result.setupType).toBe("pullback_continuation");
    expect(result.noTradeReason).toBeUndefined();
  });

  it("gives A- for moderate trend and neutral orderflow with awareness event", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 90, trendScore: 58, sentimentScore: 60, orderflowScore: 45 },
      orderflow: { flags: ["neutral"] },
      eventModifier: { classification: "awareness_only" } as EventModifier,
      signalQuality: { grade: "B", score: 65, labelKey: "ok", reasons: [] },
    });
    expect(result.setupGrade).toBe("A");
    expect(result.gradeRationale).toBeTruthy();
  });

  it("forces NO_TRADE when execution-critical event within 48h", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 90, trendScore: 70, sentimentScore: 70, orderflowScore: 60 },
      eventModifier: makeModifier(60),
      signalQuality: { grade: "A", score: 90, labelKey: "ok", reasons: [] },
    });
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason).toContain("48h");
  });

  it("forces NO_TRADE when trend or bias too weak", () => {
    const result = evaluateGoldSwing({
      asset: goldAsset,
      profile: "swing",
      rings: { biasScore: 60, trendScore: 35, sentimentScore: 55, orderflowScore: 55 },
      eventModifier: null,
      signalQuality: { grade: "C", score: 50, labelKey: "ok", reasons: [] },
    });
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason?.toLowerCase()).toContain("trend");
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
});
