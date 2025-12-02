import { describe, expect, it } from "vitest";
import { scoreFromBias } from "@/src/lib/engine/modules/biasScoring";
import { computeRingsFromSource } from "@/src/lib/engine/rings";

describe("Bias Stage 1 scoring", () => {
  it("gives high score for aligned high-confidence bias", () => {
    const score = scoreFromBias("Long", "Bullish", 85);
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("gives slight uplift for aligned moderate confidence", () => {
    const score = scoreFromBias("Long", "Bullish", 35);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(65);
  });

  it("penalizes opposite high-confidence bias strongly", () => {
    const score = scoreFromBias("Long", "Bearish", 90);
    expect(score).toBeLessThan(45);
  });

  it("handles neutral bias with mild tilt", () => {
    const score = scoreFromBias("Long", "Neutral", 60);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(65);
  });
});

describe("Bias ring resolver Stage 1", () => {
  it("combines biasScoreAtTime with baseline", () => {
    const { bias } = computeRingsFromSource({
      biasScoreAtTime: 80,
      biasScore: 60,
    });
    expect(bias).toBeCloseTo(74, 0);
  });

  it("falls back to single score", () => {
    const { bias } = computeRingsFromSource({
      biasScoreAtTime: 55,
    });
    expect(bias).toBe(55);
  });

  it("defaults to neutral when missing", () => {
    const { bias } = computeRingsFromSource({});
    expect(bias).toBe(50);
  });

  it("uses raw biasScore when no biasScoreAtTime", () => {
    const { bias } = computeRingsFromSource({
      biasScore: 78,
    });
    expect(bias).toBeGreaterThan(70);
  });
});
