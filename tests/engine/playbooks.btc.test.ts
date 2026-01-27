import { describe, expect, it } from "vitest";
import { playbookTestExports } from "@/src/lib/engine/playbooks";
import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";

const { evaluateBtcSwing } = playbookTestExports;

type BtcContext = Parameters<typeof evaluateBtcSwing>[0];

function buildContext(overrides: Partial<BtcContext> = {}): BtcContext {
  return {
    asset: { id: "btc", symbol: "BTC-USD" },
    profile: "swing",
    rings: {
      trendScore: 65,
      biasScore: 50,
      sentimentScore: null,
      orderflowScore: 55,
    },
    orderflow: { score: 55 },
    levels: {
      entryZone: "100-110",
      stopLoss: "95",
      takeProfit: "125",
      riskReward: { riskPercent: null, rewardPercent: null, rrr: 1.5, volatilityLabel: null },
    },
    ...overrides,
  };
}

function toDecisionSetup(result: ReturnType<typeof evaluateBtcSwing>) {
  return {
    setupPlaybookId: "btc-swing-v0.1",
    assetId: "btc",
    setupGrade: result.setupGrade,
    noTradeReason: result.noTradeReason ?? null,
    gradeRationale: result.gradeRationale,
  };
}

describe("btc swing playbook (offensive profile)", () => {
  it("regime gate failure yields WATCH (soft)", () => {
    const result = evaluateBtcSwing(
      buildContext({
        rings: { trendScore: 40, biasScore: 50, sentimentScore: null, orderflowScore: 35 },
        orderflow: { score: 35 },
      }),
    );
    expect(result.setupGrade).toBe("NO_TRADE");
    expect(result.noTradeReason).toBe("Regime range / chop");
    const decision = deriveSetupDecision(toDecisionSetup(result));
    expect(decision.decision).toBe("WATCH");
  });

  it("trend gate failure yields WATCH", () => {
    const result = evaluateBtcSwing(
      buildContext({
        rings: { trendScore: 50, biasScore: 50, sentimentScore: null, orderflowScore: 55 },
        orderflow: { score: 55 },
      }),
    );
    expect(result.setupGrade).toBe("NO_TRADE");
    const decision = deriveSetupDecision(toDecisionSetup(result));
    expect(decision.decision).toBe("WATCH");
  });

  it("confirmation gate failure yields WATCH", () => {
    const result = evaluateBtcSwing(
      buildContext({
        rings: { trendScore: 65, biasScore: 50, sentimentScore: null, orderflowScore: 40 },
        orderflow: { score: 40 },
      }),
    );
    expect(result.setupGrade).toBe("NO_TRADE");
    const decision = deriveSetupDecision(toDecisionSetup(result));
    expect(decision.decision).toBe("WATCH");
  });

  it("invalid RRR yields WATCH (not BLOCKED)", () => {
    const result = evaluateBtcSwing(
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
    const result = evaluateBtcSwing(buildContext());
    expect(result.setupGrade).toBe("B");
    const decision = deriveSetupDecision(toDecisionSetup(result));
    expect(decision.decision).toBe("TRADE");
  });
});
