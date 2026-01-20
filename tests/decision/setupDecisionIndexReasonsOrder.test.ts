import { describe, expect, it } from "vitest";

import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";

describe("deriveSetupDecision - index stream reason ordering", () => {
  it("prefers watch segment reason before alignment derived", () => {
    const setup = {
      assetId: "spx",
      timeframe: "1D",
      direction: "Long",
      biasScore: 80,
      confidence: 60,
      eventScore: 80, // triggers WATCH_EVENT_RISK_HIGH
      setupDecision: "WATCH",
      decisionReasons: ["No default alignment"],
      riskReward: { volatilityLabel: "low" },
    };

    const result = deriveSetupDecision(setup);

    expect(result.decision).toBe("WATCH");
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toBe("WATCH_EVENT_RISK_HIGH");
    expect(result.reasons.some((r) => r.includes("Alignment derived (index fallback"))).toBe(true);
  });

  it("prefers segment reason for ndx stream setup", () => {
    const setup = {
      assetId: "ndx",
      timeframe: "1D",
      direction: "Short",
      biasScore: 80,
      confidence: 50,
      eventScore: 75, // event risk high
      setupDecision: "WATCH",
      decisionReasons: ["No default alignment"],
      riskReward: { volatilityLabel: "medium" },
    };

    const result = deriveSetupDecision(setup);

    expect(result.decision).toBe("WATCH");
    expect(result.reasons[0]).toBe("WATCH_EVENT_RISK_HIGH");
    expect(result.reasons.some((r) => r.includes("Alignment derived (index fallback"))).toBe(true);
    expect(result.watchSegment).toBe("WATCH_EVENT_RISK_HIGH");
  });
});
