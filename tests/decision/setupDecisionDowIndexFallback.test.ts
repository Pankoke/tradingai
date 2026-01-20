import { describe, expect, it } from "vitest";

import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";

describe("deriveSetupDecision - DOW index fallback", () => {
  it("produces WATCH with segment before alignment derived", () => {
    const setup = {
      assetId: "dow",
      timeframe: "1D",
      direction: "Long",
      biasScore: 75,
      confidence: 50,
      eventScore: 80, // triggers event risk segment
      setupDecision: "WATCH",
      decisionReasons: ["No default alignment"],
      riskReward: { volatilityLabel: "medium" },
    };

    const result = deriveSetupDecision(setup);

    expect(result.decision).toBe("WATCH");
    expect(result.category).toBe("soft");
    expect(result.watchSegment).toBeDefined();
    expect(result.reasons[0]).toBe("WATCH_EVENT_RISK_HIGH");
    expect(result.reasons.some((r) => r.includes("Alignment derived (index fallback"))).toBe(true);
  });
});
