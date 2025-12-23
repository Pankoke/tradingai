import { describe, it, expect } from "vitest";
import type { Setup } from "@/src/lib/engine/types";
import { filterPremiumByProfile } from "@/src/components/setups/premiumHelpers";

const baseSetups: Setup[] = [
  { id: "s1", symbol: "AAPL", timeframe: "1D", direction: "Long", confidence: 70, biasScore: 60, sentimentScore: 55, eventScore: 50, balanceScore: 50, accessLevel: "pro", rings: {} as any, profile: "SWING" },
  { id: "s2", symbol: "BTCUSDT", timeframe: "1H", direction: "Long", confidence: 70, biasScore: 60, sentimentScore: 55, eventScore: 50, balanceScore: 50, accessLevel: "pro", rings: {} as any, profile: "INTRADAY" },
];

describe("filterPremiumByProfile", () => {
  it("returns intraday setups when profile=intraday", () => {
    const result = filterPremiumByProfile(baseSetups, "intraday");
    expect(result.selectedProfile).toBe("intraday");
    expect(result.filtered.map((s) => s.id)).toEqual(["s2"]);
  });

  it("falls back to all when filter empty", () => {
    const result = filterPremiumByProfile(baseSetups, "swing");
    expect(result.effective.length).toBeGreaterThan(0);
  });
});
