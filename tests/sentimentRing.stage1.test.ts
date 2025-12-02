import { describe, expect, it } from "vitest";
import { computeRingsFromSource } from "@/src/lib/engine/rings";

describe("Sentiment Stage-1", () => {
  it("long + bullish bias + strong energy yields high sentiment", () => {
    const { sentimentScore } = computeRingsFromSource({
      direction: "long",
      biasScoreAtTime: 80,
      breakdown: {
        trend: 70,
        momentum: 85,
      },
      eventScore: 55,
    });
    expect(sentimentScore).toBeGreaterThan(65);
  });

  it("short + bearish bias + weak energy yields low sentiment", () => {
    const { sentimentScore } = computeRingsFromSource({
      direction: "short",
      biasScoreAtTime: 20,
      breakdown: {
        trend: 30,
        momentum: 20,
      },
      eventScore: 60,
    });
    expect(sentimentScore).toBeLessThan(40);
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
    expect(sentimentScore).toBeGreaterThan(50);
    expect(sentimentScore).toBeLessThan(57);
  });

  it("no breakdown but high precomputed sentiment preserves warmth", () => {
    const { sentimentScore } = computeRingsFromSource({
      direction: "long",
      sentimentScore: 85,
      biasScore: 70,
      eventScore: 50,
    });
    expect(sentimentScore).toBeGreaterThan(75);
  });

  it("no breakdown, no precomputed sentiment, strong bias still above neutral", () => {
    const { sentimentScore } = computeRingsFromSource({
      direction: "long",
      biasScore: 88,
      eventScore: 45,
    });
    expect(sentimentScore).toBeGreaterThan(60);
  });

  it("degenerate case without data returns neutral", () => {
    const { sentimentScore } = computeRingsFromSource({});
    expect(sentimentScore).toBe(50);
  });
});
