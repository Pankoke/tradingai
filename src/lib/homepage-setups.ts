import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { Setup } from "@/src/lib/engine/types";
import { clamp } from "@/src/lib/math";

export type HomepageSetup = {
  id: string;
  assetId: string;
  symbol: string;
  timeframe: string;
  direction: Setup["direction"];
  confidence: number;
  weakSignal?: boolean;
  eventLevel: "high" | "medium" | "low";
  orderflowMode: "buyers_dominant" | "sellers_dominant" | "balanced";
  bias: {
    direction: "Bullish" | "Bearish" | "Neutral";
    strength: number;
  };
  sentimentScore: number;
  entryZone: { from: number; to: number };
  stopLoss: number;
  takeProfit: number;
  snapshotTimestamp: string;
  rings: Setup["rings"];
};

export type HomepageSetups = {
  setupOfTheDay: HomepageSetup | null;
  secondarySetups: HomepageSetup[];
};

const EVENT_LEVEL = (score: number): HomepageSetup["eventLevel"] => {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
};

function parseNumber(value: string): number {
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return 0;
  return parseFloat(match[0]);
}

function parseEntryZone(value: string): { from: number; to: number } {
  const matches = value.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) {
    return { from: 0, to: 0 };
  }
  if (matches.length === 1) {
    const num = parseFloat(matches[0]);
    return { from: num, to: num };
  }
  const nums = matches.map((m) => parseFloat(m));
  return { from: nums[0], to: nums[1] };
}

function mapSetup(setup: Setup, timestamp: string): HomepageSetup {
  return {
    id: setup.id,
    assetId: setup.assetId,
    symbol: setup.symbol,
    timeframe: setup.timeframe,
    direction: setup.direction,
    confidence: clamp(setup.confidence, 0, 100),
    weakSignal: setup.confidence < 60,
    eventLevel: EVENT_LEVEL(setup.eventScore),
    orderflowMode: "balanced",
    bias: {
      direction: setup.biasScore >= 55 ? "Bullish" : setup.biasScore <= 45 ? "Bearish" : "Neutral",
      strength: clamp(setup.biasScore, 0, 100),
    },
    sentimentScore: clamp((setup.sentimentScore - 50) / 50, -1, 1),
    entryZone: parseEntryZone(setup.entryZone),
    stopLoss: parseNumber(setup.stopLoss),
    takeProfit: parseNumber(setup.takeProfit),
    snapshotTimestamp: timestamp,
    rings: setup.rings,
  };
}

function scoreSetup(setup: HomepageSetup): number {
  const eventBonus = setup.eventLevel === "high" ? 20 : setup.eventLevel === "medium" ? 10 : 0;
  const biasBonus = setup.bias.strength * 0.1;
  const weakPenalty = setup.weakSignal ? -10 : 0;
  return (setup.confidence ?? 0) + eventBonus + biasBonus + weakPenalty;
}

export async function getHomepageSetups(): Promise<HomepageSetups> {
  const snapshot = await buildPerceptionSnapshot();
  const timestamp = snapshot.generatedAt;

  const candidates: HomepageSetup[] = snapshot.setups.map((s) => mapSetup(s, timestamp));

  if (candidates.length === 0) {
    return { setupOfTheDay: null, secondarySetups: [] };
  }

  const sorted = [...candidates].sort((a, b) => scoreSetup(b) - scoreSetup(a));
  const setupOfTheDay = sorted[0] ?? null;
  const secondarySetups = sorted.slice(1, 4);

  return { setupOfTheDay, secondarySetups };
}
