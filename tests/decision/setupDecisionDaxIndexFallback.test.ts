import { describe, expect, it } from "vitest";

import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";

describe("deriveSetupDecision - DAX index fallback", () => {
  it("downgrades stream BLOCKED with direction to WATCH and derives alignment", () => {
    const setup = {
      id: "dax-1",
      assetId: "DAX",
      timeframe: "1D",
      label: "eod",
      direction: "Short",
      biasScore: 60,
      confidence: 50,
      eventScore: 40,
      riskReward: { volatilityLabel: "medium" },
      setupDecision: "BLOCKED",
      decisionReasons: [],
    };

    const result = deriveSetupDecision(setup);

    expect(result.decision).toBe("WATCH");
    expect(result.category).toBe("soft");
    expect(result.reasons[0]).toContain("Alignment derived (index fallback");
    expect(result.reasons[0].toLowerCase()).toContain("short");
    expect(result.watchSegment).toBeDefined();
  });
});
