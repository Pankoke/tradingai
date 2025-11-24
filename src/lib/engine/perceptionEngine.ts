import { mockSetups } from "@/src/lib/mockSetups";
import { applyEventScoring } from "@/src/lib/engine/modules/eventScoring";
import { applyBiasScoring } from "@/src/lib/engine/modules/biasScoring";
import { applySentimentScoring } from "@/src/lib/engine/modules/sentimentScoring";
import { applyConfidenceScoring } from "@/src/lib/engine/modules/confidenceScoring";
import { sortSetupsForToday } from "@/src/lib/engine/modules/ranking";
import { perceptionSnapshotSchema, type PerceptionSnapshot, type Setup } from "@/src/lib/engine/types";

const ENGINE_VERSION = "0.1.0";

export async function buildPerceptionSnapshot(): Promise<PerceptionSnapshot> {
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
    };

    const eventResult = applyEventScoring(base);
    const biasResult = applyBiasScoring(base);
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

  const setups = sortSetupsForToday(enriched);

  if (setups.length === 0) {
    throw new Error("No setups available to pick setup of the day.");
  }

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
