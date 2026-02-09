import { describe, expect, test } from "vitest";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import { buildConfidenceScoreDriverBullets, buildSignalScoreDriverBullets } from "@/src/features/perception/viewModel/driverCopy";

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
    signalQuality: overrides.signalQuality
      ? { ...baseVm.signalQuality, ...overrides.signalQuality }
      : baseVm.signalQuality,
  };
}

describe("driverCopy helper", () => {
  test("dedupes identical signal bullets", () => {
    const vm = makeVm({
      signalQuality: {
        grade: "B",
        score: 68,
        labelKey: "perception.signalQuality.grade.B",
        reasons: [
          "perception.signalQuality.reason.strongOrderflow",
          "perception.signalQuality.reason.strongOrderflow",
        ],
      },
      rings: { orderflowScore: 75 } as SetupViewModel["rings"],
    });

    const bullets = buildSignalScoreDriverBullets(vm);
    const strongOrderflow = bullets.filter((item) => item.key.includes("orderflowStrong"));
    expect(strongOrderflow.length).toBe(1);
  });

  test("returns concrete confidence reasons based on scores and constraints", () => {
    const vm = makeVm({
      decision: "BLOCKED",
      setupGrade: "NO_TRADE",
      noTradeReason: "Bias too weak (<65)",
      rings: { confidenceScore: 42, eventScore: 78, trendScore: 72, biasScore: 40 } as SetupViewModel["rings"],
    });

    const bullets = buildConfidenceScoreDriverBullets(vm);
    const keys = bullets.map((item) => item.key);
    expect(keys).toContain("setup.scoreDrivers.confidence.consistencyLow");
    expect(keys).toContain("setup.scoreDrivers.confidence.eventRiskHigh");
    expect(keys).toContain("setup.scoreDrivers.confidence.alignmentMixed");
  });

  test("caps signal bullets at three entries", () => {
    const vm = makeVm({
      rings: {
        trendScore: 85,
        biasScore: 32,
        eventScore: 90,
        orderflowScore: 20,
        sentimentScore: 90,
      } as SetupViewModel["rings"],
      signalQuality: {
        grade: "C",
        score: 41,
        labelKey: "perception.signalQuality.grade.C",
        reasons: [
          "perception.signalQuality.reason.trendBiasConflict",
          "perception.signalQuality.reason.eventRiskElevated",
          "perception.signalQuality.reason.weakOrderflow",
          "perception.signalQuality.reason.sentimentExtreme",
        ],
      },
    });

    const bullets = buildSignalScoreDriverBullets(vm);
    expect(bullets.length).toBeLessThanOrEqual(3);
  });
});
