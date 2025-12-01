import { applyEventScoring } from "@/src/lib/engine/modules/eventScoring";
import { applyBiasScoring } from "@/src/lib/engine/modules/biasScoring";
import { applySentimentScoring } from "@/src/lib/engine/modules/sentimentScoring";
import { sortSetupsForToday } from "@/src/lib/engine/modules/ranking";
import { createPerceptionDataSource } from "@/src/lib/engine/perceptionDataSource";
import { computeSetupBalanceScore, computeSetupConfidence, computeSetupScore } from "@/src/lib/engine/scoring";
import { perceptionSnapshotSchema, type AccessLevel, type PerceptionSnapshot, type Setup } from "@/src/lib/engine/types";
import type { BiasSnapshot } from "@/src/lib/engine/eventsBiasTypes";
import { computeRingsForSetup } from "@/src/lib/engine/rings";

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

  const biasSnapshots = await dataSource.getBiasSnapshotForAssets({
    assetIds: setups.map((setup) => setup.symbol),
    date: asOf,
  });

  const biasSnapshot: BiasSnapshot =
    biasSnapshots[0] ?? {
      generatedAt: asOf.toISOString(),
      universe: [],
      entries: [],
      version: ENGINE_VERSION,
    };

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
      entryZone: item.entryZone,
      stopLoss: item.stopLoss,
      takeProfit: item.takeProfit,
      type: item.type,
      accessLevel: "free",
      rings: defaultRings,
      riskReward: item.riskReward,
      levelDebug: item.levelDebug,
    };

    const eventResult = applyEventScoring(base, events);
    const biasResult = applyBiasScoring(base, biasSnapshot);
    const sentimentResult = applySentimentScoring(base);
    const scoreBreakdown = computeSetupScore({
      trendStrength: eventResult.eventScore,
      biasScore: biasResult.biasScore,
      momentum: sentimentResult.sentimentScore,
      volatility: Math.abs(eventResult.eventScore - biasResult.biasScore),
      pattern: base.balanceScore,
    });
    const rings = computeRingsForSetup({
      breakdown: scoreBreakdown,
      biasScore: biasResult.biasScore,
      sentimentScore: sentimentResult.sentimentScore,
      balanceScore: base.balanceScore,
      confidence: base.confidence,
      direction: (base.direction?.toLowerCase() as "long" | "short" | "neutral") ?? null,
    });
    const confidence = computeSetupConfidence({
      setupId: base.id,
      score: scoreBreakdown,
      rings,
    });
    const balanceScore = computeSetupBalanceScore([
      eventResult.eventScore,
      biasResult.biasScore,
      sentimentResult.sentimentScore,
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

    return {
      ...base,
      eventScore: eventResult.eventScore,
      biasScore: biasResult.biasScore,
      sentimentScore: sentimentResult.sentimentScore,
      confidence,
      balanceScore,
      rings,
      levelDebug,
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
