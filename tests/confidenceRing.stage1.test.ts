import { describe, expect, it } from "vitest";
import { computeRingsFromSource } from "@/src/lib/engine/rings";

describe("Confidence Stage 1", () => {
  it("rewards strong event/bias/sentiment alignment", () => {
    const { confidenceScore } = computeRingsFromSource({
      breakdown: {
        volatility: 55,
        trend: 70,
        momentum: 80,
      },
      eventScore: 75,
      biasScore: 70,
      biasScoreAtTime: 72,
      sentimentScore: 74,
      orderflowMode: "trending",
      trendScore: 72,
    });
    expect(confidenceScore).toBeGreaterThanOrEqual(65);
  });

  it("penalizes contradictory rings", () => {
    const { confidenceScore } = computeRingsFromSource({
      breakdown: {
        volatility: 70,
        trend: 90,
        momentum: 20,
      },
      eventScore: 85,
      biasScore: 30,
      sentimentScore: 40,
      orderflowMode: "choppy",
      trendScore: 30,
    });
    expect(confidenceScore).toBeLessThan(50);
  });

  it("uses fallback weights when no breakdown", () => {
    const { confidenceScore } = computeRingsFromSource({
      eventScore: 65,
      biasScore: 60,
      sentimentScore: 70,
      orderflowMode: "trending",
      trendScore: 55,
    });
    expect(confidenceScore).toBeGreaterThan(57);
  });

  it("falls back to 50 when nothing is available", () => {
    const { confidenceScore } = computeRingsFromSource({});
    expect(confidenceScore).toBe(50);
  });

  it("incorporates precomputed confidence if no breakdown", () => {
    const { confidenceScore } = computeRingsFromSource({
      confidence: 85,
      eventScore: 60,
      biasScore: 65,
      sentimentScore: 55,
    });
    expect(confidenceScore).toBeGreaterThan(72);
  });
});
