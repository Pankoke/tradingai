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
  it("prefers setupDecision when present", () => {
    const setup = makeSetup({ setupDecision: "trade" as unknown as never });
    const decision = derivePersistedDecision(setup, { setupType: "WATCH" });
    expect(decision).toBe("TRADE");
  });

  it("falls back to setupType and noTradeReason", () => {
    const setup = makeSetup({ noTradeReason: "too weak" as unknown as never });
    const decision = derivePersistedDecision(setup, { setupType: "watch" });
    expect(decision).toBe("WATCH");
  });

  it("returns NO_TRADE when no setupDecision but has noTradeReason and no setupType", () => {
    const setup = makeSetup({ noTradeReason: "filter" as unknown as never });
    const decision = derivePersistedDecision(setup, { setupType: null });
    expect(decision).toBe("NO_TRADE");
  });

  it("returns UNKNOWN when nothing is available", () => {
    const setup = makeSetup();
    const decision = derivePersistedDecision(setup, { setupType: null });
    expect(decision).toBe("UNKNOWN");
  });
});
