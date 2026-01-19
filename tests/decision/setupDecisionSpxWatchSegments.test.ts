import { describe, expect, it } from "vitest";
import { deriveSpxWatchSegment, SPX_WATCH_SEGMENTS } from "@/src/lib/decision/spxWatchSegment";

const baseSetup = {
  assetId: "spx",
  direction: "Long",
  biasScore: 70,
  confidence: 60,
  riskReward: { volatilityLabel: "low" },
};

describe("deriveSpxWatchSegment", () => {
  it("prioritizes high volatility", () => {
    const segment = deriveSpxWatchSegment({ ...baseSetup, riskReward: { volatilityLabel: "high" } });
    expect(segment).toBe(SPX_WATCH_SEGMENTS.VOLATILITY_HIGH);
  });

  it("returns event risk before direction unknown", () => {
    const segment = deriveSpxWatchSegment({ ...baseSetup, direction: "", eventScore: 80 });
    expect(segment).toBe(SPX_WATCH_SEGMENTS.EVENT_RISK_HIGH);
  });

  it("flags missing direction", () => {
    const segment = deriveSpxWatchSegment({ ...baseSetup, direction: "" });
    expect(segment).toBe(SPX_WATCH_SEGMENTS.DIRECTION_UNKNOWN);
  });

  it("maps bias soft and near thresholds", () => {
    expect(deriveSpxWatchSegment({ ...baseSetup, biasScore: 60 })).toBe(SPX_WATCH_SEGMENTS.FAILS_BIAS_SOFT);
    expect(deriveSpxWatchSegment({ ...baseSetup, biasScore: 68 })).toBe(SPX_WATCH_SEGMENTS.FAILS_BIAS_NEAR);
  });

  it("flags low confidence", () => {
    const segment = deriveSpxWatchSegment({ ...baseSetup, confidence: 50 });
    expect(segment).toBe(SPX_WATCH_SEGMENTS.FAILS_CONFIDENCE);
  });

  it("falls back to elevated volatility", () => {
    const segment = deriveSpxWatchSegment({ ...baseSetup, riskReward: { volatilityLabel: "medium" } });
    expect(segment).toBe(SPX_WATCH_SEGMENTS.VOLATILITY_ELEVATED);
  });

  it("defaults to other", () => {
    const segment = deriveSpxWatchSegment(baseSetup);
    expect(segment).toBe(SPX_WATCH_SEGMENTS.OTHER);
  });
});
