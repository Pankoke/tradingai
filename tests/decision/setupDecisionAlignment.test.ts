import { describe, expect, it } from "vitest";

import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";

type MinimalSetup = {
  setupGrade?: string | null;
  setupPlaybookId?: string | null;
  assetClass?: string | null;
  noTradeReason?: string | null;
  biasScore?: number | null;
  trendScore?: number | null;
  entryZone?: { from?: number | null; to?: number | null };
  stopLoss?: number | null;
  takeProfit?: number | null;
  validity?: { isStale?: boolean };
  eventModifier?: { classification?: string | null } | null;
};

describe("deriveSetupDecision alignment fallback for indices", () => {
  it("downgrades missing alignment to WATCH (soft) with derived reason for index assets", () => {
    const setup: MinimalSetup = {
      setupGrade: null,
      setupPlaybookId: "spx-swing-v0.1",
      assetClass: "index",
      noTradeReason: "No default alignment",
      biasScore: 72,
      trendScore: 45,
      entryZone: { from: 1, to: 2 },
      stopLoss: 0.9,
      takeProfit: 1.1,
      validity: { isStale: false },
      eventModifier: null,
    };

    const result = deriveSetupDecision(setup);

    expect(result.decision).toBe("WATCH");
    expect(result.category).toBe("soft");
    expect(result.reasons.some((r) => r.toLowerCase().includes("alignment derived (index fallback"))).toBe(true);
  });
});
