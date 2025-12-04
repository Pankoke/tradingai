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
  entryZone: { from: number | null; to: number | null };
  stopLoss: number | null;
  takeProfit: number | null;
  category?: string | null;
  levelDebug?: Setup["levelDebug"];
  riskReward?: Setup["riskReward"];
  snapshotTimestamp: string;
  snapshotId?: string | null;
  snapshotCreatedAt?: string | null;
  rings: Setup["rings"];
  eventContext?: Setup["eventContext"] | null;
  ringAiSummary?: Setup["ringAiSummary"] | null;
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

function parseNumber(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseEntryZone(value?: string | null): { from: number | null; to: number | null } {
  if (!value) {
    return { from: null, to: null };
  }
  const matches = value.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) {
    return { from: null, to: null };
  }
  if (matches.length === 1) {
    const num = parseFloat(matches[0]);
    const safe = Number.isFinite(num) ? num : null;
    return { from: safe, to: safe };
  }
  const nums = matches.map((m) => parseFloat(m));
  const first = Number.isFinite(nums[0]) ? nums[0] : null;
  const second = Number.isFinite(nums[1]) ? nums[1] : null;
  return { from: first, to: second };
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
    category: setup.category ?? null,
    levelDebug: setup.levelDebug,
    snapshotTimestamp: timestamp,
    snapshotId: setup.snapshotId ?? null,
    snapshotCreatedAt: setup.snapshotCreatedAt ?? timestamp,
    rings: setup.rings,
    riskReward: setup.riskReward,
    eventContext: setup.eventContext ?? null,
    ringAiSummary: setup.ringAiSummary ?? null,
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
