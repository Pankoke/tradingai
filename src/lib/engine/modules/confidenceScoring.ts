import type { Setup } from "@/src/lib/engine/types";

export type ConfidenceScoreResult = {
  confidence: number;
  balanceScore: number;
};

type ConfidenceInput = {
  baseSetup: Setup;
  eventScore: number;
  biasScore: number;
  sentimentScore: number;
};

export function applyConfidenceScoring(input: ConfidenceInput): ConfidenceScoreResult {
  const { eventScore, biasScore, sentimentScore } = input;
  const weighted = 0.4 * eventScore + 0.3 * biasScore + 0.3 * sentimentScore;
  const confidence = clamp(weighted, 0, 100);

  const values = [eventScore, biasScore, sentimentScore];
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + (val - avg) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Balance hoch, wenn StdDev klein ist
  const balanceScore = clamp(100 - stdDev, 0, 100);

  return {
    confidence,
    balanceScore,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
