import { describe, expect, it } from "vitest";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";
import { ensureRingMeta } from "@/src/lib/engine/rings";
import type { Setup, SetupRingMeta } from "@/src/lib/engine/types";

const baseMeta: SetupRingMeta = ensureRingMeta();

function makeSetup(overrides: Partial<Setup> & { rings?: Partial<Setup["rings"]> } = {}): Setup {
  const rings = {
    trendScore: 70,
    biasScore: 70,
    sentimentScore: 60,
    orderflowScore: 55,
    confidenceScore: 70,
    eventScore: 50,
    event: 50,
    bias: 70,
    sentiment: 60,
    orderflow: 55,
    confidence: 70,
    orderflowMode: "buyers",
    orderflowFlags: [] as string[],
    meta: baseMeta,
    ...overrides.rings,
  };

  return {
    id: "setup-1",
    assetId: "asset-1",
    symbol: "XAUUSD",
    timeframe: "1D",
    profile: "SWING",
    setupPlaybookId: null,
    dataSourcePrimary: null,
    dataSourceUsed: null,
    providerSymbolUsed: null,
    direction: "long",
    confidence: rings.confidenceScore,
    snapshotId: null,
    snapshotCreatedAt: null,
    eventScore: rings.eventScore,
    biasScore: rings.biasScore,
    sentimentScore: rings.sentimentScore,
    balanceScore: rings.orderflowScore,
    entryZone: "0-0",
    stopLoss: "0",
    takeProfit: "0",
    category: "test",
    levelDebug: {
      bandPct: null,
      referencePrice: null,
      category: "test",
      volatilityScore: null,
      scoreVolatility: null,
    },
    orderflowMode: rings.orderflowMode,
    type: "Regelbasiert",
    accessLevel: "free",
    rings: rings as Setup["rings"],
    riskReward: { riskPercent: 1, rewardPercent: 2, rrr: 2, volatilityLabel: "medium" },
    orderflowConfidenceDelta: 0,
    validity: { isStale: false },
    sentiment: undefined,
    orderflow: {
      score: rings.orderflowScore,
      mode: "buyers",
      clv: 0,
      relVolume: 1,
      expansion: 0,
      consistency: 50,
      reasons: [],
      flags: rings.orderflowFlags,
    },
    eventContext: null,
    eventModifier: null,
    setupGrade: null,
    setupType: undefined,
    gradeRationale: [],
    noTradeReason: null,
    gradeDebugReason: undefined,
    playbookId: null,
    grade: null,
    decision: null,
    decisionVersion: null,
    decisionSegment: null,
    alignment: null,
    decisionReasons: [],
    watchSegment: null,
    ...overrides,
  } satisfies Setup;
}

describe("computeSignalQuality (Swing tuning)", () => {
  it("keeps swing divergence (Δ=25) without conflict at B or better", () => {
    const setup = makeSetup({
      rings: { trendScore: 55, biasScore: 80, orderflowFlags: [] },
    });
    const result = computeSignalQuality(setup, { profile: "SWING" });
    expect(result.grade).toBe("B");
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("penalizes swing divergence (Δ=25) only when a conflict indicator is present", () => {
    const setup = makeSetup({
      rings: { trendScore: 55, biasScore: 80, orderflowFlags: ["orderflow_trend_conflict"] },
      orderflow: {
        score: 55,
        mode: "buyers",
        clv: 0,
        relVolume: 1,
        expansion: 0,
        consistency: 50,
        reasons: [],
        flags: ["orderflow_trend_conflict"],
      },
    });
    const result = computeSignalQuality(setup, { profile: "SWING" });
    expect(result.grade).toBe("C");
    expect(result.reasons).toContain("perception.signalQuality.reason.trendBiasConflict");
  });

  it("limits low confidence penalty for swing to max downgrade B", () => {
    const setup = makeSetup({
      rings: { confidenceScore: 35, trendScore: 70, biasScore: 70 },
      confidence: 35,
    });
    const result = computeSignalQuality(setup, { profile: "SWING" });
    expect(result.grade).toBe("B");
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("keeps intraday behaviour unchanged (divergence still penalized without conflict)", () => {
    const setup = makeSetup({
      profile: "INTRADAY",
      rings: { trendScore: 80, biasScore: 45, confidenceScore: 70 },
    });
    const result = computeSignalQuality(setup, { profile: "INTRADAY" });
    expect(result.grade).toBe("C");
  });
});
