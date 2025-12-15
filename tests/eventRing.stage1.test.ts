import { describe, expect, it } from "vitest";
import { computeRingsFromSource } from "@/src/lib/engine/rings";

describe("Event ring Stage 1 (new components)", () => {
  it("boosts high volatility even with neutral trend/momentum", () => {
    const neutral = computeRingsFromSource({
      breakdown: {
        volatility: 50,
        trend: 50,
        momentum: 50,
      },
    });
    const boosted = computeRingsFromSource({
      breakdown: {
        volatility: 80,
        trend: 50,
        momentum: 50,
      },
    });

    expect(boosted.eventScore).toBeGreaterThan(neutral.eventScore);
  });

  it("reflects strong trend with little divergence", () => {
    const baseline = computeRingsFromSource({
      breakdown: {
        volatility: 60,
        trend: 60,
        momentum: 60,
      },
    });
    const trending = computeRingsFromSource({
      breakdown: {
        volatility: 60,
        trend: 90,
        momentum: 85,
      },
    });

    expect(trending.eventScore).toBeGreaterThan(baseline.eventScore);
  });

  it("picks up strong divergence between trend and momentum", () => {
    const aligned = computeRingsFromSource({
      breakdown: {
        volatility: 50,
        trend: 80,
        momentum: 80,
      },
    });
    const divergent = computeRingsFromSource({
      breakdown: {
        volatility: 50,
        trend: 80,
        momentum: 20,
      },
    });

    expect(divergent.eventScore).toBeGreaterThan(aligned.eventScore);
  });

  it("combines pattern + macro components when breakdown exists", () => {
    const base = computeRingsFromSource({
      breakdown: {
        volatility: 45,
        trend: 70,
        momentum: 55,
        pattern: 50,
      },
      patternType: "breakout",
    });
    const enriched = computeRingsFromSource({
      breakdown: {
        volatility: 45,
        trend: 70,
        momentum: 55,
        pattern: 50,
      },
      patternType: "breakout",
      eventScore: 80,
    });

    expect(enriched.eventScore).toBeGreaterThan(base.eventScore);
  });

  it("uses macro + pattern when only eventScore is available", () => {
    const neutral = computeRingsFromSource({});
    const macroPattern = computeRingsFromSource({
      eventScore: 90,
      patternType: "pullback",
    });

    expect(macroPattern.eventScore).toBeGreaterThan(neutral.eventScore);
  });

  it("defaults to neutral when no data exists", () => {
    const { eventScore } = computeRingsFromSource({});
    expect(eventScore).toBe(50);
  });
});
