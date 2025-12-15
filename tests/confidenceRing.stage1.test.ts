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
    const aligned = computeRingsFromSource({
      breakdown: {
        volatility: 55,
        trend: 70,
        momentum: 80,
      },
      eventScore: 75,
      biasScore: 70,
      sentimentScore: 74,
      orderflowMode: "trending",
      trendScore: 72,
    });
    const contradictory = computeRingsFromSource({
      breakdown: {
        volatility: 90,
        trend: 95,
        momentum: 5,
      },
      eventScore: 95,
      biasScore: 5,
      sentimentScore: 10,
      orderflowMode: "sellers",
      trendScore: 10,
    });
    expect(contradictory.confidenceScore).toBeLessThan(55);
    expect(contradictory.confidenceScore).toBeLessThan(aligned.confidenceScore - 10);
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
