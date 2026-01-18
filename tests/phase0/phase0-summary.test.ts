import { describe, expect, it } from "vitest";
import type { RiskRewardSummary, Setup } from "@/src/lib/engine/types";
import { buildPhase0SummaryForAsset } from "@/src/app/api/admin/playbooks/phase0-gold-swing/route";

type SummaryRow = { setups: Setup[]; snapshotTime: Date };

const defaultRiskReward: RiskRewardSummary = {
  riskPercent: 1,
  rewardPercent: 2,
  rrr: 2,
  volatilityLabel: "low",
};

function makeSetup(partial: Partial<Setup> & { id: string; assetId: string; symbol: string; timeframe: string; profile: string }): Setup {
  return {
    id: partial.id,
    assetId: partial.assetId,
    symbol: partial.symbol,
    timeframe: partial.timeframe,
    timeframeUsed: partial.timeframeUsed ?? partial.timeframe,
    profile: partial.profile,
    setupPlaybookId: partial.setupPlaybookId ?? null,
    dataSourcePrimary: partial.dataSourcePrimary ?? null,
    dataSourceUsed: partial.dataSourceUsed ?? null,
    providerSymbolUsed: partial.providerSymbolUsed ?? null,
    direction: partial.direction ?? "Long",
    confidence: partial.confidence ?? 60,
    snapshotId: partial.snapshotId ?? null,
    snapshotCreatedAt: partial.snapshotCreatedAt ?? new Date().toISOString(),
    eventScore: partial.eventScore ?? 50,
    biasScore: partial.biasScore ?? 70,
    sentimentScore: partial.sentimentScore ?? 50,
    balanceScore: partial.balanceScore ?? 50,
    entryZone: partial.entryZone ?? "1-2",
    stopLoss: partial.stopLoss ?? "1",
    takeProfit: partial.takeProfit ?? "3",
    category: partial.category ?? "Regelbasiert",
    levelDebug: partial.levelDebug ?? undefined,
    orderflowMode: partial.orderflowMode ?? "balanced",
    type: partial.type ?? "Regelbasiert",
    accessLevel: partial.accessLevel ?? "free",
    rings: partial.rings ?? {
      trendScore: 70,
      eventScore: 50,
      biasScore: 75,
      sentimentScore: 50,
      orderflowScore: 60,
      confidenceScore: 60,
      event: 50,
      bias: 75,
      sentiment: 50,
      orderflow: 60,
      confidence: 60,
      meta: {
        trend: { quality: "live" as const, timeframe: "daily" },
        event: { quality: "live" as const, timeframe: "daily" },
        bias: { quality: "live" as const, timeframe: "daily" },
        sentiment: { quality: "live" as const, timeframe: "daily" },
        orderflow: { quality: "live" as const, timeframe: "daily" },
        confidence: { quality: "live" as const, timeframe: "daily" },
      },
    },
    riskReward: partial.riskReward ?? defaultRiskReward,
    orderflowConfidenceDelta: partial.orderflowConfidenceDelta ?? undefined,
    ringAiSummary: partial.ringAiSummary ?? null,
    validity: partial.validity ?? { isStale: false },
    sentiment: partial.sentiment ?? undefined,
    orderflow: partial.orderflow ?? undefined,
    eventContext: partial.eventContext ?? undefined,
    eventModifier: partial.eventModifier ?? null,
    setupGrade: partial.setupGrade ?? "NO_TRADE",
    setupType: partial.setupType ?? "pullback_continuation",
    gradeRationale: partial.gradeRationale ?? [],
    noTradeReason: partial.noTradeReason ?? null,
    gradeDebugReason: partial.gradeDebugReason ?? undefined,
  } as Setup;
}

describe("buildPhase0SummaryForAsset", () => {
  it("returns summaries for gold/btc/spx with meta", () => {
    const rows: SummaryRow[] = [
      {
        snapshotTime: new Date(),
        setups: [
          makeSetup({
            id: "gold-1",
            assetId: "gold",
            symbol: "GC=F",
            timeframe: "1D",
            profile: "SWING",
            setupPlaybookId: "gold-swing-v0.2",
            setupGrade: "A",
          }),
          makeSetup({
            id: "spx-1",
            assetId: "spx",
            symbol: "^GSPC",
            timeframe: "1D",
            profile: "SWING",
            setupPlaybookId: "spx-swing-v0.1",
            setupGrade: "B",
          }),
        ],
      },
    ];

    const goldSummary = buildPhase0SummaryForAsset({
      rows,
      assetId: "gold",
      sampleWindowDays: 30,
      playbookId: "gold-swing-v0.2",
    });
    const spxSummary = buildPhase0SummaryForAsset({ rows, assetId: "spx", sampleWindowDays: 30 });
    const btcSummary = buildPhase0SummaryForAsset({ rows, assetId: "btc", sampleWindowDays: 30 });

    expect(goldSummary.meta.assetId).toBe("gold");
    expect(goldSummary.decisionDistribution.TRADE).toBe(1);
    expect(goldSummary.gradeDistribution?.A).toBe(1);

    expect(spxSummary.meta.assetId).toBe("spx");
    expect(spxSummary.decisionDistribution.TRADE).toBe(1);

    expect(btcSummary.meta.assetId).toBe("btc");
    expect(btcSummary.decisionDistribution.TRADE).toBe(0);
  });
});

