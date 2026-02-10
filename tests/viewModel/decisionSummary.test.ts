import { describe, expect, test } from "vitest";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import { buildDecisionSummaryVM } from "@/src/features/perception/viewModel/decisionSummary";

const defaultRingMeta = {
  quality: "unknown" as const,
  timeframe: "unknown" as const,
};

const baseVm: SetupViewModel = {
  id: "setup-1",
  assetId: "btc",
  symbol: "BTCUSD",
  timeframe: "1D",
  profile: "SWING",
  setupPlaybookId: "btc-swing-v0.1",
  direction: "Long",
  type: "Regelbasiert",
  setupGrade: "B",
  setupType: "pullback_continuation",
  gradeRationale: null,
  noTradeReason: null,
  gradeDebugReason: null,
  decision: "TRADE",
  decisionSegment: null,
  decisionVersion: "legacy",
  decisionReasons: [],
  decisionCategory: null,
  isWatchPlus: false,
  watchPlusLabel: null,
  rings: {
    trendScore: 70,
    eventScore: 35,
    biasScore: 72,
    sentimentScore: 62,
    orderflowScore: 65,
    confidenceScore: 68,
    event: 35,
    bias: 72,
    sentiment: 62,
    orderflow: 65,
    confidence: 68,
    meta: {
      trend: { ...defaultRingMeta },
      event: { ...defaultRingMeta },
      bias: { ...defaultRingMeta },
      sentiment: { ...defaultRingMeta },
      orderflow: { ...defaultRingMeta },
      confidence: { ...defaultRingMeta },
    },
  },
  eventContext: null,
  eventModifier: null,
  riskReward: { riskPercent: 1, rewardPercent: 2.4, rrr: 2.4, volatilityLabel: "medium" },
  ringAiSummary: null,
  sentiment: null,
  orderflow: null,
  levelDebug: null,
  signalQuality: {
    grade: "A",
    score: 82,
    labelKey: "perception.signalQuality.grade.A",
    reasons: ["perception.signalQuality.reason.default"],
  },
  entry: { from: 100, to: 105 },
  stop: { value: 97 },
  takeProfit: { value: 112 },
  bias: null,
  orderflowMode: null,
  meta: { eventLevel: "low" },
};

function makeVm(overrides: Partial<SetupViewModel> = {}): SetupViewModel {
  return {
    ...baseVm,
    ...overrides,
    rings: { ...baseVm.rings, ...overrides.rings, meta: baseVm.rings.meta },
    meta: { ...baseVm.meta, ...overrides.meta },
    signalQuality: overrides.signalQuality
      ? { ...baseVm.signalQuality, ...overrides.signalQuality }
      : baseVm.signalQuality,
    riskReward: overrides.riskReward ? { ...baseVm.riskReward, ...overrides.riskReward } : baseVm.riskReward,
  };
}

describe("buildDecisionSummaryVM", () => {
  test("builds strong summary for high-quality setup with non-wait execution mode", () => {
    const vm = makeVm({
      setupGrade: "A",
      setupType: "pullback_continuation",
      decision: "TRADE",
      rings: { trendScore: 76, biasScore: 78, orderflowScore: 70, eventScore: 30 } as SetupViewModel["rings"],
      signalQuality: { grade: "A", score: 85, labelKey: "perception.signalQuality.grade.A", reasons: [] },
      riskReward: { riskPercent: 1, rewardPercent: 2.6, rrr: 2.6, volatilityLabel: "low" },
    });

    const result = buildDecisionSummaryVM(vm);

    expect(result.band).toBe("A");
    expect(result.executionMode).toBe("pullback");
    expect(result.pros.length).toBeGreaterThan(result.cautions.length);
    expect(result.executionMode).not.toBe("wait");
    expect(result.explainability).toBeDefined();
    expect((result.explainability ?? []).length).toBeLessThanOrEqual(3);
    expect((result.explainability ?? []).length).toBeGreaterThan(0);
  });

  test("uses confirmation interpretation when trend is weak but bias is strong", () => {
    const vm = makeVm({
      setupGrade: "B",
      setupType: "range_bias",
      decision: "WATCH",
      rings: { trendScore: 40, biasScore: 74, orderflowScore: 52, eventScore: 35 } as SetupViewModel["rings"],
      signalQuality: { grade: "B", score: 61, labelKey: "perception.signalQuality.grade.B", reasons: [] },
    });

    const result = buildDecisionSummaryVM(vm);

    expect(result.executionMode).toBe("confirmation");
    expect(result.interpretation.key).toBe("setup.decisionSummary.interpretation.confirmationRequired");
  });

  test("sets reasonsAgainst and wait mode for NO_TRADE with reason", () => {
    const vm = makeVm({
      setupGrade: "NO_TRADE",
      decision: "WATCH",
      noTradeReason: "Bias too weak (<65)",
      decisionReasons: ["Bias too weak (<65)"],
      setupType: "unknown",
    });

    const result = buildDecisionSummaryVM(vm);

    expect(result.executionMode).toBe("wait");
    expect(result.reasonsAgainst?.length).toBeGreaterThan(0);
    expect(result.reasonsAgainst?.[0]?.key).toBe("setup.decisionSummary.reasonAgainst.biasConstraint");
    expect(result.uncertainty?.level).toBe("high");
  });

  test("adds elevated-event caution and event-based reason when event is execution critical", () => {
    const vm = makeVm({
      setupGrade: "NO_TRADE",
      decision: "BLOCKED",
      decisionReasons: ["Event window active"],
      eventModifier: { classification: "execution_critical" },
      rings: { eventScore: 88 } as SetupViewModel["rings"],
    });

    const result = buildDecisionSummaryVM(vm);

    expect(result.cautions.map((item) => item.key)).toContain("setup.decisionSummary.caution.eventRiskElevated");
    expect(result.reasonsAgainst?.map((item) => item.key)).toContain("setup.decisionSummary.reasonAgainst.eventConstraint");
  });

  test("adds limited-rrr caution for weak reward-to-risk profile", () => {
    const vm = makeVm({
      decision: "WATCH",
      setupGrade: "B",
      riskReward: { riskPercent: 1.2, rewardPercent: 1.4, rrr: 1.17, volatilityLabel: "high" },
      setupType: "range_bias",
    });

    const result = buildDecisionSummaryVM(vm);

    expect(result.cautions.map((item) => item.key)).toContain("setup.decisionSummary.caution.rrrLimited");
    expect(result.uncertainty?.level).toBe("low");
  });

  test("sets medium uncertainty when two or more cautions are present", () => {
    const vm = makeVm({
      decision: "WATCH",
      setupGrade: "B",
      setupType: "range_bias",
      rings: { trendScore: 40, biasScore: 45, sentimentScore: 62, orderflowScore: 40, confidenceScore: 70, eventScore: 30 } as SetupViewModel["rings"],
      riskReward: { riskPercent: 1, rewardPercent: 2.2, rrr: 2.2, volatilityLabel: "medium" },
      signalQuality: { grade: "B", score: 62, labelKey: "perception.signalQuality.grade.B", reasons: [] },
    });

    const result = buildDecisionSummaryVM(vm);

    expect(result.cautions.length).toBeGreaterThanOrEqual(2);
    expect(result.uncertainty?.level).toBe("medium");
    expect(result.explainability).toBeDefined();
    expect((result.explainability ?? []).length).toBeLessThanOrEqual(3);
    expect((result.explainability ?? []).some((item) =>
      result.pros.some((pro) => pro.key === item.key) || result.cautions.some((caution) => caution.key === item.key),
    )).toBe(true);
  });

  test("enforces at least medium uncertainty for band C even with limited cautions", () => {
    const vm = makeVm({
      setupGrade: "C",
      decision: "WATCH",
      setupType: "pullback_continuation",
      rings: {
        trendScore: 70,
        biasScore: 69,
        sentimentScore: 60,
        orderflowScore: 61,
        confidenceScore: 72,
        eventScore: 35,
      } as SetupViewModel["rings"],
      riskReward: { riskPercent: 1, rewardPercent: 2.3, rrr: 2.3, volatilityLabel: "medium" },
      signalQuality: { grade: "B", score: 75, labelKey: "perception.signalQuality.grade.B", reasons: [] },
    });

    const result = buildDecisionSummaryVM(vm);

    expect(result.band).toBe("C");
    expect(result.uncertainty?.level).toBe("medium");
  });

  test("does not return an empty explainability structure", () => {
    const vm = makeVm({
      decision: "WATCH",
      setupGrade: "B",
      setupType: "pullback_continuation",
      rings: {
        trendScore: 72,
        biasScore: 70,
        sentimentScore: 58,
        orderflowScore: 66,
        confidenceScore: 68,
        eventScore: 30,
      } as SetupViewModel["rings"],
      signalQuality: { grade: "A", score: 80, labelKey: "perception.signalQuality.grade.A", reasons: [] },
      riskReward: { riskPercent: 1.1, rewardPercent: 2.3, rrr: 2.1, volatilityLabel: "low" },
    });

    const result = buildDecisionSummaryVM(vm);

    expect(result.explainability).toBeDefined();
    expect((result.explainability ?? []).length).toBeGreaterThan(0);
    expect((result.explainability ?? []).length).toBeLessThanOrEqual(3);
  });
});
