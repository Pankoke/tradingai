import { describe, expect, it } from "vitest";
import { computeLevelsForSetup } from "@/src/lib/engine/levels";

const baseParams = {
  direction: "long" as const,
  referencePrice: 100,
  volatilityScore: 50,
  category: "pullback" as const,
  profile: "SWING" as const,
};

function make4HCandle(high: number, low: number) {
  return {
    high,
    low,
    close: (high + low) / 2,
    timestamp: new Date("2026-02-01T08:00:00Z"),
  };
}

function make1DCandle(close: number, range = 1) {
  return {
    high: close + range / 2,
    low: close - range / 2,
    close,
    timestamp: new Date(),
  };
}

describe("computeLevelsForSetup refinement (Swing)", () => {
  it("keeps levels identical when 4H refinement is missing", () => {
    const coreOnly = computeLevelsForSetup({
      ...baseParams,
      atr1dCandles: [make1DCandle(100)],
    });
    const missingRefinement = computeLevelsForSetup({
      ...baseParams,
      atr1dCandles: [make1DCandle(100)],
      refinement4H: { candles: [] },
    });

    expect(missingRefinement.entryZone).toEqual(coreOnly.entryZone);
    expect(missingRefinement.stopLoss).toEqual(coreOnly.stopLoss);
    expect(missingRefinement.takeProfit).toEqual(coreOnly.takeProfit);
    expect(missingRefinement.debug.refinementUsed).toBe(false);
    expect(missingRefinement.debug.levelsRefinementApplied).toBe(false);
    expect(missingRefinement.debug.levelsRefinementReason).toBe("missing");
    expect(missingRefinement.debug.refinementAttempted).toBe(true);
    expect(missingRefinement.debug.refinementAttemptReason).toBe("has_levels");
    expect(missingRefinement.debug.refinementSkippedReason).toBe("missing");
  });

  it("does not attempt refinement when no refinement input provided", () => {
    const res = computeLevelsForSetup({
      ...baseParams,
      atr1dCandles: [make1DCandle(100)],
      refinement4H: undefined,
    });
    expect(res.debug.refinementAttempted).toBe(false);
    expect(res.debug.refinementSkippedReason).toBe("trigger_skipped");
  });

  it("applies refinement within ATR bounds when 4H range is higher", () => {
    const atrCandles = Array.from({ length: 20 }, (_, idx) => make1DCandle(100 - idx * 0.2, 2));
    const coreOnly = computeLevelsForSetup({
      ...baseParams,
      atr1dCandles: atrCandles,
    });
    const refined = computeLevelsForSetup({
      ...baseParams,
      atr1dCandles: atrCandles,
      refinement4H: {
        candles: [
          make4HCandle(110, 100), // 10% range
          make4HCandle(108, 100),
          make4HCandle(112, 102),
        ],
        fresh: true,
      },
    });

    const coreBand = coreOnly.debug.bandPct ?? 0;
    const refinedBand = refined.debug.bandPct ?? 0;

    expect(refined.debug.refinementUsed).toBe(true);
    expect(refined.debug.levelsRefinementApplied).toBe(true);
    expect(refined.debug.levelsRefinementReason).toBe("applied");
    expect(refined.debug.refinementAttempted).toBe(true);
    expect(refined.debug.refinementAttemptReason).toBe("has_levels");
    expect(refined.debug.refinementSkippedReason).toBeNull();
    expect(refined.debug.refinementEffect?.bandPctMultiplier).toBeLessThanOrEqual(1.2);
    expect(refined.debug.refinementEffect?.boundsMode).toBe("ATR1D");
    expect(refinedBand).toBeGreaterThan(coreBand);
    expect(refinedBand / coreBand).toBeLessThanOrEqual(1.2);
  });

  it("falls back to base when bounds exceeded (tiny ATR caps)", () => {
    const tinyAtrCandles = Array.from({ length: 20 }, () => make1DCandle(100, 0.05));
    const refined = computeLevelsForSetup({
      ...baseParams,
      atr1dCandles: tinyAtrCandles,
      refinement4H: {
        candles: [
          make4HCandle(120, 90), // very wide → multiplier near upper clamp
          make4HCandle(121, 88),
        ],
        fresh: true,
      },
    });

    expect(refined.debug.refinementUsed).toBe(true);
    expect(refined.debug.levelsRefinementApplied).toBe(false);
    expect(refined.debug.levelsRefinementReason).toBe("bounds_exceeded");
  });

  it("does not apply refinement for non-swing profiles even if provided", () => {
    const withRefinement = computeLevelsForSetup({
      ...baseParams,
      profile: "INTRADAY",
      refinement4H: { candles: [make4HCandle(110, 100)] },
    });
    expect(withRefinement.debug.refinementUsed).toBe(false);
    expect(withRefinement.debug.refinementAttempted).toBe(false);
    expect(withRefinement.debug.refinementSkippedReason).toBe("trigger_skipped");
  });
});
