import { describe, it, expect } from "vitest";
import type { Setup } from "@/src/lib/engine/types";
import { filterPremiumByProfile } from "@/src/components/setups/premiumHelpers";

const baseRings: Setup["rings"] = {
  trendScore: 0,
  eventScore: 0,
  biasScore: 0,
  sentimentScore: 0,
  orderflowScore: 0,
  confidenceScore: 0,
  event: 0,
  bias: 0,
  sentiment: 0,
  orderflow: 0,
  confidence: 0,
  meta: {
    trend: { quality: "unknown" },
    event: { quality: "unknown" },
    bias: { quality: "unknown" },
    sentiment: { quality: "unknown" },
    orderflow: { quality: "unknown" },
    confidence: { quality: "unknown" },
  },
};

const makeSetup = (overrides: Partial<Setup>): Setup => ({
  id: "base",
  assetId: "asset",
  symbol: "AAPL",
  timeframe: "1D",
  direction: "Long",
  confidence: 50,
  biasScore: 50,
  sentimentScore: 50,
  eventScore: 50,
  balanceScore: 50,
  entryZone: null,
  stopLoss: null,
  takeProfit: null,
  type: "Regelbasiert",
  accessLevel: "pro",
  rings: baseRings,
  riskReward: { riskPercent: null, rewardPercent: null, rrr: null, volatilityLabel: null },
  ...overrides,
});

const baseSetups: Setup[] = [
  makeSetup({ id: "s1", symbol: "AAPL", timeframe: "1D", profile: "SWING", confidence: 70, biasScore: 60, sentimentScore: 55 }),
  makeSetup({ id: "s2", symbol: "BTCUSDT", timeframe: "1H", profile: "INTRADAY", confidence: 70, biasScore: 60, sentimentScore: 55 }),
];

describe("filterPremiumByProfile", () => {
  it("returns intraday setups when profile=intraday", () => {
    const result = filterPremiumByProfile(baseSetups, "intraday");
    expect(result.selectedProfile).toBe("intraday");
    expect(result.filtered.map((s) => s.id)).toEqual(["s2"]);
  });

  it("falls back to all when filter empty", () => {
    const result = filterPremiumByProfile(baseSetups, "swing");
    expect(result.effective.length).toBeGreaterThan(0);
  });
});
