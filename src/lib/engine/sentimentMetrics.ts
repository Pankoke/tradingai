import type { Asset } from "@/src/server/repositories/assetRepository";
import type { SentimentRawSnapshot } from "@/src/server/sentiment/SentimentProvider";

export type SentimentLabel = "bullish" | "neutral" | "bearish";

export type SentimentMetrics = {
  score: number;
  label: SentimentLabel;
  reasons: string[];
  raw?: SentimentRawSnapshot | null;
};

type BuildParams = {
  asset: Asset;
  sentiment?: SentimentRawSnapshot | null;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveLabel(score: number): SentimentLabel {
  if (score >= 65) return "bullish";
  if (score <= 35) return "bearish";
  return "neutral";
}

export function buildSentimentMetrics(params: BuildParams): SentimentMetrics {
  const reasons: string[] = [];
  let score = 50;

  const sentiment = params.sentiment;
  if (!sentiment) {
    reasons.push("No sentiment data available");
    return {
      score,
      label: resolveLabel(score),
      reasons,
      raw: null,
    };
  }

  if (typeof sentiment.fundingRate === "number") {
    if (sentiment.fundingRate > 0.02) {
      const impact = Math.min(20, sentiment.fundingRate * 400);
      score -= impact;
      reasons.push("Positive funding – crowded longs");
    } else if (sentiment.fundingRate < -0.02) {
      const impact = Math.min(20, Math.abs(sentiment.fundingRate) * 400);
      score += impact;
      reasons.push("Negative funding – crowded shorts");
    }
  }

  if (typeof sentiment.openInterestChangePct === "number") {
    if (sentiment.openInterestChangePct > 5) {
      score += 5;
      reasons.push("Open interest rising");
    } else if (sentiment.openInterestChangePct < -5) {
      score -= 5;
      reasons.push("Open interest falling");
    }
  }

  const longLiq = sentiment.longLiquidationsUsd ?? 0;
  const shortLiq = sentiment.shortLiquidationsUsd ?? 0;
  if (longLiq > shortLiq * 1.5 && longLiq > 1_000_000) {
    score += 4;
    reasons.push("Long liquidations spike (capitulation)");
  } else if (shortLiq > longLiq * 1.5 && shortLiq > 1_000_000) {
    score -= 4;
    reasons.push("Short liquidations spike (squeeze risk)");
  }

  const finalScore = clampScore(score);
  const label = resolveLabel(finalScore);

  if (label === "bullish") {
    reasons.push("Sentiment leans bullish");
  } else if (label === "bearish") {
    reasons.push("Sentiment leans bearish");
  } else {
    reasons.push("Sentiment neutral");
  }

  return {
    score: finalScore,
    label,
    reasons,
    raw: sentiment,
  };
}
