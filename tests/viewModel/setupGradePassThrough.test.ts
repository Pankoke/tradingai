import { describe, expect, it } from "vitest";
import { toSetupViewModel } from "@/src/components/perception/setupViewModel/toSetupViewModel";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import type { Setup } from "@/src/lib/engine/types";
import { createDefaultRings } from "@/src/lib/engine/rings";

const baseRings = createDefaultRings();

const baseSetup: Setup = {
  id: "s1",
  assetId: "asset-1",
  symbol: "XAUUSD",
  timeframe: "1D",
  profile: "SWING",
  direction: "Long",
  type: "Regelbasiert",
  confidence: 80,
  snapshotId: null,
  snapshotCreatedAt: null,
  eventScore: 60,
  biasScore: 80,
  sentimentScore: 65,
  balanceScore: 55,
  entryZone: "100-110",
  stopLoss: "95",
  takeProfit: "130",
  category: "gold",
  levelDebug: undefined,
  orderflowMode: "balanced",
  accessLevel: "free",
  rings: { ...baseRings, biasScore: 80, trendScore: 55, sentimentScore: 65, orderflowScore: 50 },
  riskReward: { riskPercent: 2, rewardPercent: 6, rrr: 3, volatilityLabel: "medium" },
  orderflowConfidenceDelta: undefined,
  ringAiSummary: null,
  validity: undefined,
  sentiment: undefined,
  orderflow: undefined,
  eventContext: null,
  eventModifier: null,
  setupGrade: "A",
  setupType: "pullback_continuation",
  gradeRationale: ["Bias strong"],
  noTradeReason: undefined,
};

const baseHomepage: HomepageSetup = {
  id: "h1",
  assetId: "asset-1",
  symbol: "XAUUSD",
  timeframe: "1D",
  profile: "SWING",
  direction: "Long",
  setupGrade: "B",
  setupType: "range_bias",
  gradeRationale: ["Default alignment"],
  noTradeReason: null,
  confidence: 75,
  weakSignal: false,
  eventLevel: "high",
  orderflowMode: "balanced",
  bias: { direction: "Bullish", strength: 80 },
  sentimentScore: 0.4,
  entryZone: { from: 100, to: 110 },
  stopLoss: 95,
  takeProfit: 130,
  category: "gold",
  levelDebug: undefined,
  snapshotTimestamp: new Date().toISOString(),
  snapshotId: null,
  snapshotCreatedAt: null,
  rings: { ...baseRings, biasScore: 80, trendScore: 50, sentimentScore: 60, orderflowScore: 50 },
  riskReward: { riskPercent: 2, rewardPercent: 6, rrr: 3, volatilityLabel: "medium" },
  eventContext: null,
  eventModifier: null,
  ringAiSummary: null,
  sentiment: null,
  orderflow: null,
};

describe("setup grade pass-through", () => {
  it("keeps setupGrade/setupType in Setup view model", () => {
    const vm = toSetupViewModel(baseSetup);
    expect(vm.setupGrade).toBe("A");
    expect(vm.setupType).toBe("pullback_continuation");
    expect(vm.gradeRationale).toContain("Bias strong");
  });

  it("keeps setupGrade/setupType in Homepage view model", () => {
    const vm = toSetupViewModel(baseHomepage);
    expect(vm.setupGrade).toBe("B");
    expect(vm.setupType).toBe("range_bias");
    expect(vm.gradeRationale).toContain("Default alignment");
  });
});
