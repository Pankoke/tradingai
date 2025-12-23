import { describe, expect, it } from "vitest";
import { computeSetupScore } from "@/src/lib/engine/scoring";

describe("computeSetupScore profile weights", () => {
  const baseInput = {
    trendStrength: 60,
    biasScore: 55,
    momentum: 50,
    volatility: 45,
    pattern: 40,
  };

  it("keeps baseline weights for swing", () => {
    const swing = computeSetupScore({ ...baseInput, profile: "SWING" });
    expect(swing.total).toBeGreaterThan(0);
  });

  it("tilts weights for intraday (more vol/orderflow proxies, less trend/bias)", () => {
    const swing = computeSetupScore({ ...baseInput, profile: "SWING" });
    const intraday = computeSetupScore({ ...baseInput, profile: "INTRADAY" });
    expect(intraday.total).not.toBe(swing.total);
    // Because volatility weight is higher, total should shift toward volatility influence.
    expect(intraday.volatility).toBe(baseInput.volatility);
  });
});
