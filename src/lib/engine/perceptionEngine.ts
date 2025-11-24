import { mockSetups } from "@/src/lib/mockSetups";
import { perceptionSnapshotSchema, type PerceptionSnapshot, type Setup } from "@/src/lib/engine/types";

const ENGINE_VERSION = "0.1.0";

function pickSetupOfTheDay(setups: Setup[]): Setup {
  if (setups.length === 0) {
    throw new Error("No setups available to pick setup of the day.");
  }
  const sorted = [...setups].sort((a, b) => b.confidence - a.confidence);
  return sorted[0];
}

export async function buildPerceptionSnapshot(): Promise<PerceptionSnapshot> {
  const setups: Setup[] = mockSetups.map((item) => ({
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
  }));

  const setupOfTheDay = pickSetupOfTheDay(setups);

  const candidate: PerceptionSnapshot = {
    generatedAt: new Date().toISOString(),
    universe: ["crypto", "fx", "commodities"],
    setups,
    setupOfTheDayId: setupOfTheDay.id,
    version: ENGINE_VERSION,
  };

  return perceptionSnapshotSchema.parse(candidate);
}
