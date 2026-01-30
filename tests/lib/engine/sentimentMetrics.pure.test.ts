import { describe, expect, it } from "vitest";

import { buildSentimentMetrics } from "@/src/lib/engine/sentimentMetrics";
import type { SentimentSnapshotV2 } from "@/src/domain/sentiment/types";

const asset = {
  id: "btc",
  symbol: "BTC",
  displaySymbol: "BTC",
  name: "BTC",
  assetClass: "crypto" as const,
  baseCurrency: null,
  quoteCurrency: null,
  isActive: true,
  createdAt: null,
  updatedAt: null,
};

describe("sentimentMetrics (SnapshotV2)", () => {
  it("computes contributions from snapshot components", () => {
    const snapshot: SentimentSnapshotV2 = {
      assetId: "btc",
      asOfIso: "2025-01-01T00:00:00.000Z",
      window: {
        fromIso: "2024-12-31T00:00:00.000Z",
        toIso: "2025-01-01T00:00:00.000Z",
      },
      sources: [],
      components: {
        biasScore: 90,
        trendScore: 80,
        momentumScore: 80,
        orderflowScore: 80,
        rrr: 3.5,
        riskPercent: 1,
        volatilityLabel: "low",
        driftPct: 1,
      },
      meta: {},
    };

    const result = buildSentimentMetrics({
      asset,
      sentiment: snapshot,
    });

    expect(result.score).toBe(92);
    expect(result.label).toBe("extreme_bullish");
    expect(result.flags).toContain("supports_trend");
    expect(result.flags).toContain("supports_bias");
    expect(result.raw).toBe(snapshot);
    expect(result.contributions && result.contributions.length).toBeGreaterThan(0);
  });

  it("returns neutral, low-conviction when snapshot components are missing", () => {
    const snapshot: SentimentSnapshotV2 = {
      assetId: "btc",
      asOfIso: "2025-01-01T00:00:00.000Z",
      window: {
        fromIso: "2024-12-31T00:00:00.000Z",
        toIso: "2025-01-01T00:00:00.000Z",
      },
      sources: [],
      components: {},
      meta: {},
    };

    const result = buildSentimentMetrics({
      asset,
      sentiment: snapshot,
    });

    expect(result.score).toBe(50);
    expect(result.label).toBe("neutral");
    expect(result.flags).toContain("low_conviction");
    expect(result.contributions).toBeUndefined();
  });
});
