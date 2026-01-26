import { describe, expect, it } from "vitest";
import type { Setup } from "@/src/lib/engine/types";
import { derivePersistedDecision } from "@/src/features/perception/build/buildSetups";

function makeSetup(overrides: Partial<Setup> = {}): Setup {
  return {
    id: "s1",
    assetId: "wti",
    symbol: "WTI",
    timeframe: "1D",
    direction: "long",
    biasScore: 70,
    sentimentScore: 60,
    balanceScore: 55,
    confidence: 65,
    sentiment: null,
    eventScore: 50,
    orderflow: null,
    entryZone: null,
    stopLoss: null,
    takeProfit: null,
    riskReward: null,
    ...overrides,
  } as Setup;
}

describe("persisted dimensions write helper", () => {
  it("prefers persisted decision when present", () => {
    const setup = makeSetup({ decision: "watch_plus" as unknown as never });
    const decision = derivePersistedDecision(setup);
    expect(decision).toBe("WATCH_PLUS");
  });

  it("falls back to setupDecision when decision is missing", () => {
    const setup = makeSetup({ setupDecision: "trade" as unknown as never });
    const decision = derivePersistedDecision(setup);
    expect(decision).toBe("TRADE");
  });

  it("returns UNKNOWN when nothing is available", () => {
    const setup = makeSetup();
    const decision = derivePersistedDecision(setup);
    expect(decision).toBe("UNKNOWN");
  });
});
