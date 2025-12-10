import { applyEventScoring } from "@/src/lib/engine/modules/eventScoring";
import { applyBiasScoring } from "@/src/lib/engine/modules/biasScoring";
import { applySentimentScoring } from "@/src/lib/engine/modules/sentimentScoring";
import { sortSetupsForToday } from "@/src/lib/engine/modules/ranking";
import { createPerceptionDataSource } from "@/src/lib/engine/perceptionDataSource";
import { computeSetupBalanceScore, computeSetupConfidence, computeSetupScore } from "@/src/lib/engine/scoring";
import { perceptionSnapshotSchema, type AccessLevel, type PerceptionSnapshot, type Setup } from "@/src/lib/engine/types";
import type { BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";
import { computeRingsForSetup } from "@/src/lib/engine/rings";
import { buildRingAiSummaryForSetup } from "@/src/lib/engine/modules/ringAiSummary";

const ENGINE_VERSION = "0.1.0";
const dataSource = createPerceptionDataSource();

const defaultRings = {
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
};

export async function buildPerceptionSnapshot(options?: { asOf?: Date }): Promise<PerceptionSnapshot> {
  const asOf = options?.asOf ?? new Date();
  const setups = await dataSource.getSetupsForToday({ asOf });

  const windowFrom = new Date(asOf);
  windowFrom.setHours(windowFrom.getHours() - 12);
  const windowTo = new Date(asOf);
  windowTo.setHours(windowTo.getHours() + 12);

  const events = await dataSource.getEventsForWindow({
    from: windowFrom,
    to: windowTo,
  });

  const biasSnapshot: BiasSnapshot = await dataSource.getBiasSnapshotForAssets({
    assets: setups.map((setup) => ({
      assetId: setup.assetId ?? setup.symbol,
      symbol: setup.symbol,
      timeframe: setup.timeframe,
    })),
    date: asOf,
  });

  const enriched: Setup[] = setups.map((item) => {
    const base: Setup = {
      id: item.id,
      assetId: item.assetId ?? item.symbol,
      symbol: item.symbol,
      timeframe: item.timeframe,
      direction: item.direction,
      confidence: item.confidence,
      eventScore: item.eventScore,
      biasScore: item.biasScore,
      sentimentScore: item.sentimentScore,
      balanceScore: item.balanceScore,
      orderflowMode: item.orderflowMode ?? null,
      entryZone: item.entryZone,
      stopLoss: item.stopLoss,
      takeProfit: item.takeProfit,
      type: item.type,
      accessLevel: "free",
      rings: item.rings ?? defaultRings,
      riskReward: item.riskReward,
      levelDebug: item.levelDebug,
      sentiment: item.sentiment,
      orderflow: item.orderflow,
      orderflowConfidenceDelta: item.orderflowConfidenceDelta,
      validity: item.validity,
    };

    const eventResult = applyEventScoring(base, events);
    const biasResult = applyBiasScoring(base, biasSnapshot);
    const sentimentResult = applySentimentScoring(base);
    const sentimentScore = base.sentiment?.score ?? sentimentResult.sentimentScore;
    const sentimentDetail =
      base.sentiment ?? {
        score: sentimentScore,
        label: sentimentScore >= 65 ? "bullish" : sentimentScore <= 35 ? "bearish" : "neutral",
        reasons: ["Heuristic sentiment scoring"],
      };
    const scoreBreakdown = computeSetupScore({
      trendStrength: eventResult.eventScore,
      biasScore: biasResult.biasScore,
      momentum: sentimentScore,
      volatility: Math.abs(eventResult.eventScore - biasResult.biasScore),
      pattern: base.balanceScore,
    });
    const effectiveOrderflowScore =
      typeof base.orderflow?.score === "number" ? base.orderflow.score : base.balanceScore ?? 50;
    const rings = computeRingsForSetup({
      breakdown: scoreBreakdown,
      biasScore: biasResult.biasScore,
      sentimentScore,
      balanceScore: base.balanceScore,
      orderflowScore: effectiveOrderflowScore,
      confidence: base.confidence,
      direction: (base.direction?.toLowerCase() as "long" | "short" | "neutral") ?? null,
      assetId: base.assetId,
      symbol: base.symbol,
      timeframe: base.timeframe,
      setupId: base.id,
    });
    const confidence = computeSetupConfidence({
      setupId: base.id,
      score: scoreBreakdown,
      rings,
    });
    const balanceScore = computeSetupBalanceScore([
      eventResult.eventScore,
      biasResult.biasScore,
      sentimentScore,
    ]);

      const fallbackLevelDebug = base.levelDebug ?? {
        bandPct: null,
        referencePrice: null,
        category: base.category ?? "unknown",
        volatilityScore: null,
      };
    const levelDebug = {
      ...fallbackLevelDebug,
      category: fallbackLevelDebug.category ?? base.category ?? "unknown",
      scoreVolatility: scoreBreakdown.volatility ?? null,
    };

    const ringAiSummary = buildRingAiSummaryForSetup({
      setup: {
        ...base,
        rings,
        confidence,
        riskReward: base.riskReward,
      },
    });

    return {
        ...base,
        eventScore: eventResult.eventScore,
        biasScore: biasResult.biasScore,
        sentimentScore,
        confidence,
        balanceScore,
        rings,
        levelDebug,
        sentiment: sentimentDetail,
        eventContext: eventResult.context,
        ringAiSummary,
      };
    });

  const ranked = sortSetupsForToday(enriched);

  if (ranked.length === 0) {
    throw new Error("No setups available to pick setup of the day.");
  }

  const maxPremiumIndex = Math.min(ranked.length - 1, 9);
  const rankedSetups = ranked.map((setup, index) => {
    let accessLevel: AccessLevel;
    if (index <= 3) {
      accessLevel = "free";
    } else if (index <= maxPremiumIndex) {
      accessLevel = "premium";
    } else {
      accessLevel = "pro";
    }
    return { ...setup, accessLevel };
  });

  const setupOfTheDay = rankedSetups[0];

  const candidate: PerceptionSnapshot = {
    generatedAt: new Date().toISOString(),
    universe: ["crypto", "fx", "commodities"],
    setups: rankedSetups,
    setupOfTheDayId: setupOfTheDay.id,
    version: ENGINE_VERSION,
  };

  return perceptionSnapshotSchema.parse(candidate);
}
