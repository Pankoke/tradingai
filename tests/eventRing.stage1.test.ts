import { describe, expect, it } from "vitest";
import { computeRingsFromSource } from "@/src/lib/engine/rings";

describe("Event ring Stage 1 (new components)", () => {
  it("boosts high volatility even with neutral trend/momentum", () => {
    const { eventScore } = computeRingsFromSource({
      breakdown: {
        volatility: 80,
        trend: 50,
        momentum: 50,
      },
    });

    expect(eventScore).toBe(47);
  });

  it("reflects strong trend with little divergence", () => {
    const { eventScore } = computeRingsFromSource({
      breakdown: {
        volatility: 60,
        trend: 90,
        momentum: 85,
      },
    });

    expect(eventScore).toBe(40);
  });

  it("picks up strong divergence between trend and momentum", () => {
    const { eventScore } = computeRingsFromSource({
      breakdown: {
        volatility: 50,
        trend: 80,
        momentum: 20,
      },
    });

    expect(eventScore).toBe(40);
  });

  it("combines pattern + macro components when breakdown exists", () => {
    const { eventScore } = computeRingsFromSource({
      breakdown: {
        volatility: 45,
        trend: 70,
        momentum: 55,
        pattern: 50,
      },
      patternType: "breakout",
      eventScore: 80,
    });

    expect(eventScore).toBeGreaterThanOrEqual(60);
  });

  it("uses macro + pattern when only eventScore is available", () => {
    const { eventScore } = computeRingsFromSource({
      eventScore: 90,
      patternType: "pullback",
    });

    expect(eventScore).toBe(78);
  });

  it("defaults to neutral when no data exists", () => {
    const { eventScore } = computeRingsFromSource({});
    expect(eventScore).toBe(50);
  });
});
