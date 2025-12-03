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

type BiasAlignment = "aligned" | "opposite" | "neutral";

function determineAlignment(direction: Direction, entryDirection: BiasDirection): BiasAlignment {
  const aligned =
    (direction === "Long" && entryDirection === "Bullish") ||
    (direction === "Short" && entryDirection === "Bearish");
  if (aligned) return "aligned";
  const opposite =
    (direction === "Long" && entryDirection === "Bearish") ||
    (direction === "Short" && entryDirection === "Bullish");
  if (opposite) return "opposite";
  return "neutral";
}

function structuralStrength(entryConfidence: number): number {
  const base = clamp(entryConfidence, 0, 100);
  const strength = 50 + 0.7 * (base - 50);
  return clamp(Math.round(strength), 0, 100);
}

export function scoreFromBias(
  direction: Direction,
  entryDirection: BiasDirection,
  entryConfidence: number,
): number {
  const alignment = determineAlignment(direction, entryDirection);
  const strength = structuralStrength(entryConfidence);
  let delta = 0;
  if (alignment === "aligned") {
    delta = 5 + 0.3 * (strength - 50);
  } else if (alignment === "opposite") {
    delta = -(10 + 0.4 * (strength - 50));
  } else {
    delta = 0.2 * (strength - 50);
  }
  const raw = strength + delta;
  const score = clamp(Math.round(raw), 0, 100);

  if (process.env.DEBUG_BIAS === "1") {
    console.log("[BiasScoring:computed]", {
      direction,
      entryDirection,
      entryConfidence,
      structuralStrength: strength,
      alignment,
      delta,
      score,
    });
  }

  return score;
}

export function applyBiasScoring(setup: Setup, biasSnapshot: BiasSnapshot): BiasScoreResult {
  const entry = findBiasEntry(setup, biasSnapshot);
  if (!entry) {
    return { biasScore: 50 };
  }
  const biasScore = scoreFromBias(setup.direction, entry.direction, entry.confidence);
  return { biasScore };
}
