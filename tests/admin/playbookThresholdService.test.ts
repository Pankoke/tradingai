import { describe, expect, it, vi } from "vitest";
import { loadGoldThresholdRecommendations } from "@/src/server/admin/playbookThresholdService";
import type { Setup } from "@/src/lib/engine/types";
import * as outcomeRepo from "@/src/server/repositories/setupOutcomeRepository";

vi.mock("@/src/server/repositories/setupOutcomeRepository", () => ({
  listOutcomesForWindow: vi.fn(async () => {
    const rows = [];
    for (let i = 0; i < 20; i++) {
      rows.push({
        id: `tp${i}`,
        setupId: `s${i}`,
        snapshotId: "snap1",
        assetId: "GC=F",
        outcomeStatus: "hit_tp",
        setupGrade: "A",
        playbookId: "gold-swing-v0.2",
      });
    }
    for (let i = 0; i < 15; i++) {
      rows.push({
        id: `sl${i}`,
        setupId: `s${i + 20}`,
        snapshotId: "snap1",
        assetId: "GC=F",
        outcomeStatus: "hit_sl",
        setupGrade: "A",
        playbookId: "gold-swing-v0.2",
      });
    }
    return rows;
  }),
}));

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  getSnapshotById: vi.fn(async () => {
    const setups: Setup[] = [];
    for (let i = 0; i < 35; i++) {
      setups.push({
        id: `s${i}`,
        assetId: "GC=F",
        symbol: "GC=F",
        timeframe: "1D",
        profile: "SWING",
        setupPlaybookId: "gold-swing-v0.2",
        direction: "Long",
        confidence: 70 + (i % 5),
        snapshotId: "snap1",
        snapshotCreatedAt: new Date().toISOString(),
        eventScore: 50,
        biasScore: 85 + (i % 5),
        sentimentScore: 70,
        balanceScore: 60,
        entryZone: "1",
        stopLoss: "0.9",
        takeProfit: "1.1",
        category: "pullback",
        levelDebug: { bandPct: null, referencePrice: null, category: "pullback", volatilityScore: null, scoreVolatility: null },
        orderflowMode: null,
        type: "KI",
        accessLevel: "free",
        rings: {
          trendScore: 60 + (i % 5),
          eventScore: 50,
          biasScore: 85 + (i % 5),
          sentimentScore: 70,
          orderflowScore: 55 + (i % 3),
          confidenceScore: 70 + (i % 5),
          event: 50,
          bias: 80,
          sentiment: 60,
          orderflow: 55,
          confidence: 70,
          meta: {
            trend: { quality: "live" },
            event: { quality: "live" },
            bias: { quality: "live" },
            sentiment: { quality: "live" },
            orderflow: { quality: "live" },
            confidence: { quality: "live" },
          },
        },
        riskReward: { riskPercent: 5, rewardPercent: 10, rrr: 2, volatilityLabel: "medium" },
        orderflowConfidenceDelta: undefined,
        ringAiSummary: null,
        validity: undefined,
        sentiment: undefined,
        orderflow: undefined,
        eventContext: undefined,
        eventModifier: { classification: "none" },
        setupGrade: "A",
        setupType: "pullback_continuation",
        gradeRationale: [],
        noTradeReason: null,
        gradeDebugReason: undefined,
      });
    }
    return { setups };
  }),
}));

describe("playbookThresholdService", () => {
  it("returns recommendations with sufficient data", async () => {
    const rec = await loadGoldThresholdRecommendations({ days: 90 });
    expect(rec.insufficientData).toBe(false);
    expect(rec.recommended).toBeTruthy();
    expect(rec.samples.closed).toBeGreaterThan(0);
  });

  it("returns insufficient when data too small", async () => {
    const spy = vi.spyOn(outcomeRepo, "listOutcomesForWindow");
    spy.mockResolvedValueOnce([]);
    const rec = await loadGoldThresholdRecommendations({ days: 90 });
    expect(rec.insufficientData).toBe(true);
  });

  it("caps recommendations within delta", async () => {
    const rec = await loadGoldThresholdRecommendations({ days: 90 });
    expect(rec.recommended?.biasMin).toBeLessThanOrEqual(rec.current.biasMin + 10);
  });
});
