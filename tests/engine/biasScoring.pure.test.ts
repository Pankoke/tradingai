import { describe, expect, it } from "vitest";
import { applyBiasScoring } from "@/src/lib/engine/modules/biasScoring";
import type { Setup } from "@/src/lib/engine/types";
import type { BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";

const baseSetup: Setup = {
  id: "s1",
  assetId: "BTCUSDT",
  symbol: "BTCUSDT",
  timeframe: "1D",
  direction: "Long",
  confidence: 50,
  eventScore: 50,
  biasScore: 50,
  sentimentScore: 50,
  balanceScore: 50,
  momentumScore: 50,
  trendScore: 50,
  volatilityScore: 50,
  orderflowMode: "balanced",
  rings: {
    eventScore: 50,
    biasScore: 50,
    sentimentScore: 50,
    confidence: 50,
    orderflowScore: 50,
    trendScore: 50,
  },
  validity: {
    isStale: false,
  },
  profile: "SWING",
  accessLevel: "free",
  sentiment: null,
};

describe("biasScoring (pure)", () => {
  it("returns deterministic bias meta using provided asOf", () => {
    const asOf = "2024-01-02T00:00:00.000Z";
    const snapshot: BiasSnapshot = {
      generatedAt: asOf,
      universe: ["BTCUSDT"],
      version: "live",
      entries: [
        {
          symbol: "BTCUSDT",
          timeframe: "1D",
          direction: "Bullish",
          confidence: 70,
          biasScore: 20,
          comment: "",
        },
      ],
    };

    const result = applyBiasScoring(baseSetup, snapshot);

    expect(result.biasScore).toBeGreaterThan(50);
    expect(result.meta.asOf).toBe(asOf);
    expect(result.meta.quality).toBe("live");
  });
});
