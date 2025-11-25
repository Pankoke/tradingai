import type { Setup, Direction } from "@/src/lib/engine/types";
import type { BiasSnapshot, BiasEntry, BiasDirection } from "@/src/lib/engine/eventsBiasTypes";

export type BiasScoreResult = {
  biasScore: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findBiasEntry(setup: Setup, snapshot: BiasSnapshot): BiasEntry | undefined {
  const exact = snapshot.entries.find(
    (entry) => entry.symbol === setup.symbol && entry.timeframe === setup.timeframe,
  );
  if (exact) return exact;
  return snapshot.entries.find((entry) => entry.symbol === setup.symbol);
}

function scoreFromBias(direction: Direction, entryDirection: BiasDirection, entryConfidence: number): number {
  const aligned =
    (direction === "Long" && entryDirection === "Bullish") ||
    (direction === "Short" && entryDirection === "Bearish");
  const opposite =
    (direction === "Long" && entryDirection === "Bearish") ||
    (direction === "Short" && entryDirection === "Bullish");

  if (aligned) {
    return clamp(entryConfidence + 20, 0, 100);
  }
  if (opposite) {
    return clamp(entryConfidence - 20, 0, 100);
  }
  // Neutral or no direct match: around confidence
  return clamp(entryConfidence, 0, 100);
}

export function applyBiasScoring(setup: Setup, biasSnapshot: BiasSnapshot): BiasScoreResult {
  const entry = findBiasEntry(setup, biasSnapshot);
  if (!entry) {
    return { biasScore: 50 };
  }
  const biasScore = scoreFromBias(setup.direction, entry.direction, entry.confidence);
  return { biasScore };
}
