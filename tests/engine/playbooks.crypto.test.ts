import { describe, expect, it } from "vitest";
import { playbookTestExports } from "@/src/lib/engine/playbooks";
import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";

const { evaluateCryptoSwing } = playbookTestExports;

type CryptoContext = Parameters<typeof evaluateCryptoSwing>[0];

function buildContext(overrides: Partial<CryptoContext> = {}): CryptoContext {
  return {
    asset: { id: "btc", symbol: "BTC-USD" },
    profile: "swing",
    rings: {
      trendScore: 70,
      biasScore: 50,
      sentimentScore: null,
      orderflowScore: 60,
    },
    orderflow: { score: 60 },
    levels: {
      entryZone: "100-110",
      stopLoss: "95",
      takeProfit: "125",
      riskReward: { riskPercent: null, rewardPercent: null, rrr: 1.5, volatilityLabel: null },
    },
    ...overrides,
  };
}

function toDecisionSetup(result: ReturnType<typeof evaluateCryptoSwing>) {
  return {
    setupPlaybookId: "crypto-swing-v0.1",
    setupGrade: result.setupGrade,
    noTradeReason: result.noTradeReason ?? null,
    gradeRationale: result.gradeRationale,
  };
}

describe("crypto swing class playbook", () => {
  it("regime != TREND yields WATCH (market rejection)", () => {
    const result = evaluateCryptoSwing(
      buildContext({
        rings: { trendScore: 40, biasScore: 50, sentimentScore: null, orderflowScore: 40 },
        orderflow: { score: 40 },
      }),
    );
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason).toBe("Regime range / chop");
    const decision = deriveSetupDecision(toDecisionSetup(result));
    expect(decision.decision).toBe("WATCH");
  });

  it("trend ok but confirmation missing yields WATCH", () => {
    const result = evaluateCryptoSwing(
      buildContext({
        rings: { trendScore: 70, biasScore: 50, sentimentScore: null, orderflowScore: 40 },
        orderflow: { score: 60 },
      }),
    );
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason).toBe("Confirmation failed / chop");
    const decision = deriveSetupDecision(toDecisionSetup(result));
    expect(decision.decision).toBe("WATCH");
  });

  it("invalid RRR yields NO_TRADE (not BLOCKED)", () => {
    const result = evaluateCryptoSwing(
      buildContext({
        levels: {
          entryZone: "100-110",
          stopLoss: "95",
          takeProfit: "125",
          riskReward: { riskPercent: null, rewardPercent: null, rrr: 0.8, volatilityLabel: null },
        },
      }),
    );
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason).toBe("Invalid RRR / levels");
    const decision = deriveSetupDecision(toDecisionSetup(result));
    expect(decision.decision).toBe("WATCH");
  });

  it("all gates pass yields TRADE (grade B)", () => {
    const result = evaluateCryptoSwing(buildContext());
    expect(result.setupGrade).toBe("B");
    const decision = deriveSetupDecision(toDecisionSetup(result));
    expect(decision.decision).toBe("TRADE");
  });
});
