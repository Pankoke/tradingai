import { clamp } from "@/src/lib/math";
import type { SentimentMetrics } from "@/src/lib/engine/sentimentMetrics";
import type { SentimentFlag } from "@/src/lib/engine/types";

export const SENTIMENT_CONFIDENCE_TUNING = {
  supportScore: 70,
  supportBoost: 4,
  strongScore: 85,
  strongBoost: 6,
  contrarianPenalty: 6,
  eventPenalty: 4,
  rrrPenalty: 3,
  crowdedPenalty: 6,
  lowConvictionPenalty: 3,
} as const;

const SUPPORT_FLAGS: SentimentFlag[] = ["supports_trend", "supports_bias"];
const CRITICAL_FLAGS: SentimentFlag[] = [
  "contrarian_to_trend",
  "contrarian_to_bias",
  "high_risk_crowded",
  "event_capped",
  "rrr_mismatch",
];

export type ConfidenceAdjustmentResult = {
  adjusted: number;
  delta: number;
};

export function applySentimentConfidenceAdjustment(params: {
  base: number;
  sentiment: SentimentMetrics;
}): ConfidenceAdjustmentResult {
  const { base, sentiment } = params;
  const flags = new Set(sentiment.flags ?? []);
  let delta = 0;

  const supportive = SUPPORT_FLAGS.some((flag) => flags.has(flag));
  const hasCritical = CRITICAL_FLAGS.some((flag) => flags.has(flag));

  if (sentiment.score >= SENTIMENT_CONFIDENCE_TUNING.supportScore && supportive) {
    delta += SENTIMENT_CONFIDENCE_TUNING.supportBoost;
  }

  if (sentiment.score >= SENTIMENT_CONFIDENCE_TUNING.strongScore && !hasCritical) {
    delta += SENTIMENT_CONFIDENCE_TUNING.strongBoost;
  }

  if (flags.has("contrarian_to_trend") || flags.has("contrarian_to_bias")) {
    delta -= SENTIMENT_CONFIDENCE_TUNING.contrarianPenalty;
  }

  if (flags.has("event_capped")) {
    delta -= SENTIMENT_CONFIDENCE_TUNING.eventPenalty;
  }

  if (flags.has("rrr_mismatch")) {
    delta -= SENTIMENT_CONFIDENCE_TUNING.rrrPenalty;
  }

  if (flags.has("high_risk_crowded")) {
    delta -= SENTIMENT_CONFIDENCE_TUNING.crowdedPenalty;
  }

  if (flags.has("low_conviction")) {
    delta -= SENTIMENT_CONFIDENCE_TUNING.lowConvictionPenalty;
  }

  const adjusted = clamp(Math.round(base + delta), 0, 100);
  return { adjusted, delta };
}

export const SENTIMENT_RANKING_TUNING = {
  positiveScore: 70,
  positiveBonus: 3,
  strongScore: 85,
  strongBonus: 5,
  negativeScore: 35,
  negativePenalty: 4,
  criticalFlagPenalty: 4,
  penaltyFlags: ["contrarian_to_trend", "contrarian_to_bias", "high_risk_crowded", "event_capped", "rrr_mismatch"],
} as const;

export type RankingAdjustmentResult = {
  delta: number;
  hint: "positive" | "negative" | "neutral";
};

export function computeSentimentRankingAdjustment(
  sentiment?: Pick<SentimentMetrics, "score" | "flags"> | null,
): RankingAdjustmentResult {
  if (!sentiment) {
    return { delta: 0, hint: "neutral" };
  }

  let delta = 0;
  const flags = new Set(sentiment.flags ?? []);
  const hasPenaltyFlag = SENTIMENT_RANKING_TUNING.penaltyFlags.some((flag) => flags.has(flag));

  if (sentiment.score >= SENTIMENT_RANKING_TUNING.strongScore && !hasPenaltyFlag) {
    delta += SENTIMENT_RANKING_TUNING.strongBonus;
  } else if (sentiment.score >= SENTIMENT_RANKING_TUNING.positiveScore && !hasPenaltyFlag) {
    delta += SENTIMENT_RANKING_TUNING.positiveBonus;
  }

  if (sentiment.score <= SENTIMENT_RANKING_TUNING.negativeScore) {
    delta -= SENTIMENT_RANKING_TUNING.negativePenalty;
  }

  if (hasPenaltyFlag) {
    delta -= SENTIMENT_RANKING_TUNING.criticalFlagPenalty;
  }

  const hint = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  return { delta, hint };
}
