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

describe("computeLevelsForSetup refinement (Swing)", () => {
  it("keeps levels identical when 4H refinement is missing", () => {
    const coreOnly = computeLevelsForSetup(baseParams);
    const missingRefinement = computeLevelsForSetup({
      ...baseParams,
      refinement4H: { candles: [] },
    });

    expect(missingRefinement.entryZone).toEqual(coreOnly.entryZone);
    expect(missingRefinement.stopLoss).toEqual(coreOnly.stopLoss);
    expect(missingRefinement.takeProfit).toEqual(coreOnly.takeProfit);
    expect(missingRefinement.debug.refinementUsed).toBe(false);
  });

  it("widens bands moderately (<=20%) when 4H refinement has higher range", () => {
    const coreOnly = computeLevelsForSetup(baseParams);
    const refined = computeLevelsForSetup({
      ...baseParams,
      refinement4H: {
        candles: [
          make4HCandle(110, 100), // 10% range
          make4HCandle(108, 100),
          make4HCandle(112, 102),
        ],
      },
    });

    const coreBand = coreOnly.debug.bandPct ?? 0;
    const refinedBand = refined.debug.bandPct ?? 0;

    expect(refined.debug.refinementUsed).toBe(true);
    expect(refined.debug.refinementEffect?.bandPctMultiplier).toBeLessThanOrEqual(1.2);
    expect(refinedBand).toBeGreaterThan(coreBand);
    expect(refinedBand / coreBand).toBeLessThanOrEqual(1.2);
  });

  it("does not apply refinement for non-swing profiles even if provided", () => {
    const withRefinement = computeLevelsForSetup({
      ...baseParams,
      profile: "INTRADAY",
      refinement4H: { candles: [make4HCandle(110, 100)] },
    });
    expect(withRefinement.debug.refinementUsed).toBe(false);
  });
});
