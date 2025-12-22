import { describe, expect, test } from "vitest";

import type { Setup } from "@/src/lib/engine/types";
import { applyFilter, applySort, buildAssetOptions, displayAssetName } from "@/src/components/setups/premiumHelpers";

const baseSetup = (overrides: Partial<Setup>): Setup =>
  ({
    id: "id",
    assetId: "asset",
    symbol: "SYM",
    timeframe: "1D",
    direction: "Long",
    confidence: 50,
    eventScore: 50,
    biasScore: 50,
    sentimentScore: 50,
    balanceScore: 0,
    setupRatingScore: 0,
    entryZone: null,
    stopLoss: null,
    takeProfit: null,
    rings: {
      trendScore: 50,
      eventScore: 50,
      biasScore: 50,
      sentimentScore: 50,
      orderflowScore: 50,
      confidenceScore: 50,
      event: 50,
      bias: 50,
      sentiment: 50,
      orderflow: 50,
      confidence: 50,
      meta: {
        trend: { quality: "unknown" },
        event: { quality: "unknown" },
        bias: { quality: "unknown" },
        sentiment: { quality: "unknown" },
        orderflow: { quality: "unknown" },
        confidence: { quality: "unknown" },
      },
    },
    riskReward: { riskPercent: null, rewardPercent: null, rrr: null, volatilityLabel: null },
    snapshotCreatedAt: "2024-01-02T00:00:00Z",
    snapshotId: "snap",
    category: null,
    ringAiSummary: null,
    eventContext: null,
    levelDebug: null,
    sentiment: null,
    setupType: null,
    signalQuality: undefined,
    ...overrides,
  }) as Setup;

describe("premiumHelpers", () => {
  test("applyFilter filters by direction and asset", () => {
    const setups = [
      baseSetup({ id: "1", direction: "Long", symbol: "A" }),
      baseSetup({ id: "2", direction: "Short", symbol: "B" }),
      baseSetup({ id: "3", direction: "Long", symbol: "B" }),
    ];
    expect(applyFilter(setups, "long").map((s) => s.id)).toEqual(["1", "3"]);
    expect(applyFilter(setups, "short").map((s) => s.id)).toEqual(["2"]);
    expect(applyFilter(setups, "all", "b").map((s) => s.id)).toEqual(["2", "3"]);
  });

  test("applySort sorts by confidence (ring) and signal quality (direct) with undefined last", () => {
    const baseRings = baseSetup({}).rings;
    const a = baseSetup({ id: "a", rings: { ...baseRings, confidenceScore: 10 } });
    const b = baseSetup({ id: "b", rings: { ...baseRings, confidenceScore: 80 } });
    const c = baseSetup({ id: "c", rings: { ...baseRings, confidenceScore: 50 } });
    const sorted = applySort([a, b, c], "confidence", "desc");
    expect(sorted.map((s) => s.id)).toEqual(["b", "c", "a"]);

    const withSignal = baseSetup({ id: "d", signalQuality: 5 });
    const sortedSignal = applySort([a, withSignal], "signal_quality", "asc");
    expect(sortedSignal.map((s) => s.id)).toEqual(["d", "a"]);
  });

  test("applySort sorts by rrr", () => {
    const a = baseSetup({ id: "a", riskReward: { riskPercent: null, rewardPercent: null, rrr: 1.5, volatilityLabel: null } });
    const b = baseSetup({
      id: "b",
      riskReward: { riskPercent: null, rewardPercent: null, rrr: 0.8, volatilityLabel: null },
      snapshotCreatedAt: "2024-02-01T00:00:00Z",
    });
    const c = baseSetup({
      id: "c",
      riskReward: { riskPercent: null, rewardPercent: null, rrr: 2.0, volatilityLabel: null },
      snapshotCreatedAt: "2023-12-31T00:00:00Z",
    });
    const rrrDesc = applySort([a, b, c], "risk_reward", "desc");
    expect(rrrDesc.map((s) => s.id)).toEqual(["c", "a", "b"]);
  });

  test("buildAssetOptions sorts by frequency then name and uses display names", () => {
    const setups = [
      baseSetup({ symbol: "BTC-USD" }),
      baseSetup({ symbol: "BTC-USD" }),
      baseSetup({ symbol: "^GSPC" }),
      baseSetup({ symbol: "EURUSD=X" }),
    ];
    const opts = buildAssetOptions(setups);
    expect(opts[0].symbol).toBe("BTC-USD");
    expect(opts[0].display).toBe("BTC");
    expect(opts[1].symbol).toBe("EURUSD=X");
    expect(opts[1].display).toBe("EUR/USD");
    expect(opts[2].symbol).toBe("^GSPC");
  });

  test("displayAssetName formats known symbols and fallbacks", () => {
    expect(displayAssetName("^GDAXI")).toBe("DAX");
    expect(displayAssetName("GC=F")).toBe("Gold");
    expect(displayAssetName("EURJPY=X")).toBe("EUR/JPY");
    expect(displayAssetName("XYZ")).toBe("XYZ");
  });
});
