import { describe, expect, it } from "vitest";

import { deriveFxWatchSegment, FX_WATCH_SEGMENTS } from "@/src/lib/decision/fxWatchSegment";
import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";
import type { Setup } from "@/src/lib/engine/types";

const baseSetup: Partial<Setup> = {
  assetId: "eurusd",
  assetClass: "fx",
  profile: "SWING",
  timeframeUsed: "1D",
  setupPlaybookId: "eurusd-swing-v0.1",
  setupDecision: "WATCH",
  setupGrade: "NO_TRADE",
};

describe("EURUSD FX watch segments", () => {
  it("derives segments by precedence", () => {
    expect(deriveFxWatchSegment({ ...baseSetup, eventScore: 80 } as Setup)).toBe(FX_WATCH_SEGMENTS.EVENT_RISK_HIGH);
    expect(deriveFxWatchSegment({ ...baseSetup, biasScore: 50 } as Setup)).toBe(FX_WATCH_SEGMENTS.FAILS_BIAS);
    expect(deriveFxWatchSegment({ ...baseSetup, biasScore: 80, trendScore: 40 } as Setup)).toBe(FX_WATCH_SEGMENTS.FAILS_TREND);
    expect(deriveFxWatchSegment({ ...baseSetup, biasScore: 80, trendScore: 80, confidence: 40 } as Setup)).toBe(
      FX_WATCH_SEGMENTS.FAILS_CONFIDENCE,
    );
    expect(deriveFxWatchSegment({ ...baseSetup, biasScore: 80, trendScore: 80, confidence: 80 } as Setup)).toBe(FX_WATCH_SEGMENTS.OTHER);
  });

  it("places segment reason before alignment fallback in decision reasons", () => {
    const decision = deriveSetupDecision({
      ...baseSetup,
      decisionReasons: ["No default alignment"],
      biasScore: 50,
      trendScore: 40,
      confidence: 40,
    } as Setup);

    expect(decision.decision).toBe("WATCH");
    expect(decision.reasons.length).toBeGreaterThan(0);
    expect(decision.reasons[0]).toBe(FX_WATCH_SEGMENTS.FAILS_BIAS); // segment reason should lead
    const alignmentReason = decision.reasons.find((r) => r.toLowerCase().includes("alignment"));
    expect(alignmentReason).toBe("Alignment unavailable (fx)");
  });
});
