import { describe, expect, it } from "vitest";

import { recomputeDecisionsInSetups } from "@/src/server/admin/recomputeDecisions";
import type { Setup } from "@/src/lib/engine/types";

describe("recomputeDecisionsInSetups", () => {
  it("updates decisions for matching asset/timeframe", () => {
    const setups = [
      {
        id: "s1",
        assetId: "SPX",
        symbol: "SPX",
        timeframe: "1D",
        direction: "Long",
        confidence: 55,
        eventScore: 50,
        biasScore: 75,
        sentimentScore: 50,
        balanceScore: 50,
        entryZone: "1 - 2",
        stopLoss: "0.9",
        takeProfit: "1.1",
        rings: {
          trend: { score: 60, meta: { quality: "live" } },
          event: { score: 50, meta: { quality: "live" } },
          bias: { score: 75, meta: { quality: "live" } },
          sentiment: { score: 50, meta: { quality: "live" } },
          orderflow: { score: 55, meta: { quality: "live" } },
          confidence: { score: 55, meta: { quality: "live" } },
        },
        riskReward: { riskPercent: 1, rewardPercent: 2, rrr: 2, volatilityLabel: "low" },
        type: "KI",
        accessLevel: "premium",
        setupPlaybookId: "spx-swing-v0.1",
        setupGrade: "NO_TRADE",
        setupType: "pullback_continuation",
        decision: "WATCH",
        setupOfTheDay: false,
        setupUniverseRank: 1,
        setupAssetRank: 1,
        orderflowConfidenceDelta: 0,
        validity: { isStale: false },
        profile: "SWING",
        timeframeUsed: "1D",
        ringsMeta: {},
        ringsVersion: "v1",
        riskRewardType: "static",
      } as unknown as Record<string, unknown>,
    ];

    const result = recomputeDecisionsInSetups(setups as Array<Setup & Record<string, unknown>>, {
      assetId: "spx",
      timeframe: "1D",
      now: new Date("2025-01-01T00:00:00Z"),
    });

    expect(result.consideredCount).toBe(1);
    expect(result.updatedCount).toBe(0);
    expect(result.setups[0]).toEqual(setups[0]);
    expect(result.decisionDistribution["WATCH"]).toBe(1);
    expect(result.updatedIds.length).toBe(0);
  });

  it("does not modify non-matching asset/timeframe setups", () => {
    const baseSetup = {
      id: "s2",
      assetId: "GOLD",
      timeframe: "1D",
      setupDecision: "BLOCKED",
    };
    const spxSetup = {
      id: "s3",
      assetId: "SPX",
      timeframe: "1D",
      direction: "Long",
      biasScore: 80,
      confidence: 60,
      decision: "BLOCKED",
    };
    const btcSetup = {
      id: "s4",
      assetId: "BTC",
      timeframe: "1H",
      setupDecision: "BLOCKED",
    };

    const setups: Array<Setup & Record<string, unknown>> = [
      baseSetup as unknown as Setup,
      spxSetup as unknown as Setup,
      btcSetup as unknown as Setup,
    ];

    const result = recomputeDecisionsInSetups(structuredClone(setups), {
      assetId: "spx",
      timeframe: "1D",
      now: new Date("2025-01-01T00:00:00Z"),
    });

    expect(result.consideredCount).toBe(1);
    expect(result.updatedCount).toBe(0);
    // non-matching entries stay byte-identical
    expect(result.setups[0]).toEqual(baseSetup);
    expect(result.setups[2]).toEqual(btcSetup);
    // matching entry remains unchanged
    expect(result.setups[1]).toEqual(spxSetup);
  });
});
