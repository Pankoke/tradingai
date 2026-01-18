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
    expect(result.updatedCount).toBe(1);
    expect((result.setups[0] as Record<string, unknown>).setupDecision).toBeDefined();
    const total =
      (result.decisionDistribution["TRADE"] ?? 0) +
      (result.decisionDistribution["WATCH"] ?? 0) +
      (result.decisionDistribution["BLOCKED"] ?? 0);
    expect(total).toBeGreaterThan(0);
  });
});
