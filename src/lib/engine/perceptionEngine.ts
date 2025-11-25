import { mockSetups } from "@/src/lib/mockSetups";
import { applyEventScoring } from "@/src/lib/engine/modules/eventScoring";
import { applyBiasScoring } from "@/src/lib/engine/modules/biasScoring";
import { applySentimentScoring } from "@/src/lib/engine/modules/sentimentScoring";
import { applyConfidenceScoring } from "@/src/lib/engine/modules/confidenceScoring";
import { sortSetupsForToday } from "@/src/lib/engine/modules/ranking";
import { mockEvents } from "@/src/lib/mockEvents";
import { mockBiasSnapshot } from "@/src/lib/mockBias";
import { perceptionSnapshotSchema, type AccessLevel, type PerceptionSnapshot, type Setup } from "@/src/lib/engine/types";

const ENGINE_VERSION = "0.1.0";

export async function buildPerceptionSnapshot(): Promise<PerceptionSnapshot> {
  const events = mockEvents;
  const biasSnapshot = mockBiasSnapshot;

  const enriched: Setup[] = mockSetups.map((item) => {
    const base: Setup = {
      id: item.id,
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
    };

    const eventResult = applyEventScoring(base, events);
    const biasResult = applyBiasScoring(base, biasSnapshot);
    const sentimentResult = applySentimentScoring(base);
    const confidenceResult = applyConfidenceScoring({
      baseSetup: base,
      eventScore: eventResult.eventScore,
      biasScore: biasResult.biasScore,
      sentimentScore: sentimentResult.sentimentScore,
    });

    return {
      ...base,
      eventScore: eventResult.eventScore,
      biasScore: biasResult.biasScore,
      sentimentScore: sentimentResult.sentimentScore,
      confidence: confidenceResult.confidence,
      balanceScore: confidenceResult.balanceScore,
    };
  });

  const ranked = sortSetupsForToday(enriched);

  if (ranked.length === 0) {
    throw new Error("No setups available to pick setup of the day.");
  }

  const maxPremiumIndex = Math.min(ranked.length - 1, 9);
  const setups = ranked.map((setup, index) => {
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

  const setupOfTheDay = setups[0];

  const candidate: PerceptionSnapshot = {
    generatedAt: new Date().toISOString(),
    universe: ["crypto", "fx", "commodities"],
    setups,
    setupOfTheDayId: setupOfTheDay.id,
    version: ENGINE_VERSION,
  };

  return perceptionSnapshotSchema.parse(candidate);
}
