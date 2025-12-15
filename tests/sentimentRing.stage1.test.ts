import { describe, expect, it } from "vitest";
import { computeRingsFromSource } from "@/src/lib/engine/rings";

describe("Sentiment Stage-1", () => {
  it("long + bullish bias + strong energy beats bearish setup", () => {
    const strong = computeRingsFromSource({
      direction: "long",
      biasScoreAtTime: 80,
      breakdown: {
        trend: 70,
        momentum: 85,
      },
      eventScore: 55,
    });
    const weak = computeRingsFromSource({
      direction: "short",
      biasScoreAtTime: 20,
      breakdown: {
        trend: 30,
        momentum: 20,
      },
      eventScore: 60,
    });
    expect(strong.sentimentScore).toBeGreaterThan(weak.sentimentScore + 20);
  });

  it("short + bearish bias + weak energy yields lower sentiment", () => {
    const bearish = computeRingsFromSource({
      direction: "short",
      biasScoreAtTime: 20,
      breakdown: {
        trend: 30,
        momentum: 20,
      },
      eventScore: 60,
    });
    expect(bearish.sentimentScore).toBeLessThan(45);
  });

  it("neutral market with breakdown stays around neutral", () => {
    const { sentimentScore } = computeRingsFromSource({
      direction: "long",
      biasScoreAtTime: 50,
      breakdown: {
        trend: 52,
        momentum: 48,
      },
      eventScore: 50,
    });
    expect(sentimentScore).toBeGreaterThan(45);
    expect(sentimentScore).toBeLessThan(60);
  });

  it("no breakdown but high precomputed sentiment preserves warmth", () => {
    const { sentimentScore } = computeRingsFromSource({
      direction: "long",
      sentimentScore: 85,
      biasScore: 70,
      eventScore: 50,
    });
    expect(sentimentScore).toBeGreaterThanOrEqual(70);
  });

  it("no breakdown, no precomputed sentiment, strong bias still above neutral", () => {
    const { sentimentScore } = computeRingsFromSource({
      direction: "long",
      biasScore: 88,
      eventScore: 45,
    });
    expect(sentimentScore).toBeGreaterThan(55);
  });

  it("degenerate case without data returns neutral", () => {
    const { sentimentScore } = computeRingsFromSource({});
    expect(sentimentScore).toBe(50);
  });
});
