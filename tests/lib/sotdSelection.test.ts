import { describe, it, expect } from "vitest";
import type { Setup } from "@/src/lib/engine/types";
import { selectSwingSotd } from "@/src/lib/setups/sotd";

const setups: Setup[] = [
  { id: "i1", symbol: "BTCUSDT", timeframe: "1H", direction: "Long", confidence: 60, biasScore: 55, sentimentScore: 50, eventScore: 50, balanceScore: 50, accessLevel: "free", rings: {} as any, profile: "INTRADAY" },
  { id: "s1", symbol: "AAPL", timeframe: "1D", direction: "Long", confidence: 70, biasScore: 60, sentimentScore: 55, eventScore: 50, balanceScore: 50, accessLevel: "free", rings: {} as any, profile: "SWING" },
];

describe("selectSwingSotd", () => {
  it("prefers swing setups even when intraday is first", () => {
    const result = selectSwingSotd(setups);
    expect(result?.id).toBe("s1");
  });

  it("returns first when no swing exists", () => {
    const result = selectSwingSotd([setups[0]]);
    expect(result?.id).toBe("i1");
  });
});
