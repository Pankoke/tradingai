import { describe, expect, it } from "vitest";

import { deriveFxAlignment } from "@/src/lib/decision/fxAlignment";
import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";
import type { Setup } from "@/src/lib/engine/types";

describe("FX alignment model", () => {
  it("derives LONG/SHORT/NEUTRAL from scores and direction", () => {
    expect(
      deriveFxAlignment({
        biasScore: 75,
        trendScore: 60,
      } as Setup),
    ).toBe("LONG");

    expect(
      deriveFxAlignment({
        biasScore: 30,
        trendScore: 40,
      } as Setup),
    ).toBe("SHORT");

    expect(
      deriveFxAlignment({
        biasScore: 55,
        trendScore: 50,
      } as Setup),
    ).toBe("NEUTRAL");

    expect(
      deriveFxAlignment({
        direction: "Short",
      } as Setup),
    ).toBe("SHORT");

    expect(deriveFxAlignment({} as Setup)).toBeNull();
  });

  it("keeps FX alignment reasons and avoids fallback noise in decisions", () => {
    const result = deriveSetupDecision({
      assetId: "eurusd",
      assetClass: "fx",
      profile: "SWING",
      timeframeUsed: "1D",
      setupPlaybookId: "eurusd-swing-v0.1",
      setupDecision: "WATCH",
      decisionReasons: ["No default alignment"],
      biasScore: 80,
      trendScore: 70,
      setupGrade: "NO_TRADE",
    } as unknown as Setup);

    expect(result.decision).toBe("WATCH");
    expect(result.reasons.some((r) => r.includes("Alignment fx LONG"))).toBe(true);
    expect(result.reasons.some((r) => r.toLowerCase().includes("no default alignment"))).toBe(false);
    expect(result.reasons.some((r) => r.includes("Alignment unavailable (fx)"))).toBe(false);
  });
});

