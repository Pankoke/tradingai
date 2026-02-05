import { describe, expect, it } from "vitest";
import { deriveBaseConfidenceScore } from "@/src/lib/engine/confidence";
import type { MarketMetrics } from "@/src/lib/engine/marketMetrics";

function baseMetrics(partial: Partial<MarketMetrics> = {}): MarketMetrics {
  return {
    trendScore: 60,
    momentumScore: 50,
    volatilityScore: 50,
    priceDriftPct: 0,
    lastPrice: 100,
    isStale: false,
    reasons: [],
    evaluatedAt: new Date("2024-01-01T00:00:00Z").toISOString(),
    ...partial,
  };
}

describe("deriveBaseConfidenceScore", () => {
  it("keeps swing confidence neutral for drift within 8% and ignores stale penalty", () => {
    const metrics = baseMetrics({ priceDriftPct: 7, isStale: true });
    const score = deriveBaseConfidenceScore(metrics, { profile: "SWING" });
    expect(score).toBe(68);
  });

  it("reduces swing confidence gradually only beyond 8% drift", () => {
    const metrics = baseMetrics({ priceDriftPct: 10 });
    const score = deriveBaseConfidenceScore(metrics, { profile: "SWING" });
    expect(score).toBe(67);
  });

  it("does not penalize swing confidence for stale market data", () => {
    const metrics = baseMetrics({ isStale: true });
    const score = deriveBaseConfidenceScore(metrics, { profile: "SWING" });
    expect(score).toBe(68);
  });

  it("keeps intraday behaviour unchanged (drift penalty + stale penalty)", () => {
    const metrics = baseMetrics({ priceDriftPct: 6, isStale: true });
    const score = deriveBaseConfidenceScore(metrics, { profile: "INTRADAY" });
    expect(score).toBe(45);
  });
});
