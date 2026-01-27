import { describe, it, expect } from "vitest";
import type { Setup } from "@/src/lib/engine/types";
import { selectSwingSotd } from "@/src/lib/setups/sotd";

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
  accessLevel: "free",
  rings: baseRings,
  riskReward: { riskPercent: null, rewardPercent: null, rrr: null, volatilityLabel: null },
  ...overrides,
});

const setups: Setup[] = [
  makeSetup({ id: "i1", symbol: "BTCUSDT", timeframe: "1H", profile: "INTRADAY", confidence: 60, biasScore: 55, sentimentScore: 50 }),
  makeSetup({ id: "s1", symbol: "AAPL", timeframe: "1D", profile: "SWING", confidence: 70, biasScore: 60, sentimentScore: 55 }),
];

describe("selectSwingSotd", () => {
  it("prefers swing setups even when intraday is first", () => {
    const result = selectSwingSotd(setups);
    expect(result?.id).toBe("s1");
  });

  it("returns first when no swing exists", () => {
    const result = selectSwingSotd([setups[0]]);
    expect(result?.id).toBe("i1");
  });
});
