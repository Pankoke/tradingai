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

function normalizeBiasTilt(entryBiasScore?: number): number {
  if (typeof entryBiasScore !== "number" || Number.isNaN(entryBiasScore)) {
    return 50;
  }
  // Map -100..100 to 0..100 where 0 = max bearish, 100 = max bullish.
  return clamp(Math.round(50 + entryBiasScore / 2), 0, 100);
}

export function scoreFromBias(
  direction: Direction,
  entryDirection: BiasDirection,
  entryConfidence: number,
  entryBiasScore?: number,
): number {
  const alignment = determineAlignment(direction, entryDirection);
  const strength = structuralStrength(entryConfidence);
  const tilt = normalizeBiasTilt(entryBiasScore);

  const baseDirectional =
    direction === "Short"
      ? 100 - tilt
      : direction === "Long"
        ? tilt
        : 50;

  const alignmentDelta = alignment === "aligned" ? 10 : alignment === "opposite" ? -25 : 0;
  const confidenceDelta = 0.5 * (strength - 50);
  const raw = baseDirectional + alignmentDelta + confidenceDelta;
  const score = clamp(Math.round(raw), 0, 100);

  return score;
}

export function applyBiasScoring(setup: Setup, biasSnapshot: BiasSnapshot): BiasScoreResult {
  const entry = findBiasEntry(setup, biasSnapshot);
  if (!entry) {
    return { biasScore: 50 };
  }
  const biasScore = scoreFromBias(
    setup.direction,
    entry.direction,
    entry.confidence,
    entry.biasScore,
  );
  return { biasScore };
}
