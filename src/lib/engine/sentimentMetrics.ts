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

function describeFunding(rate: number): string {
  const annualized = rate * 3 * 365 * 100;
  return `${annualized.toFixed(1)}% annualized`;
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

  // Funding bias: strong positive → bearish (crowded longs), strong negative → bullish.
  if (typeof sentiment.fundingRate === "number") {
    const rate = sentiment.fundingRate;
    if (rate > 0.01) {
      const impact = Math.min(18, Math.abs(rate) * 1800);
      score -= impact;
      reasons.push(`High positive funding (${describeFunding(rate)}) → crowded longs`);
    } else if (rate > 0.004) {
      score -= 6;
      reasons.push(`Moderate positive funding (${describeFunding(rate)})`);
    } else if (rate < -0.01) {
      const impact = Math.min(18, Math.abs(rate) * 1800);
      score += impact;
      reasons.push(`High negative funding (${describeFunding(rate)}) → shorts paying`);
    } else if (rate < -0.004) {
      score += 6;
      reasons.push(`Moderate negative funding (${describeFunding(rate)})`);
    }
  }

  // Open interest change (percentage) → conviction build-up / unwind.
  if (typeof sentiment.openInterestChangePct === "number") {
    const change = sentiment.openInterestChangePct;
    if (change > 7) {
      score += 8;
      reasons.push(`Open interest rising ${change.toFixed(1)}%`);
    } else if (change > 3) {
      score += 4;
      reasons.push(`Open interest up ${change.toFixed(1)}%`);
    } else if (change < -7) {
      score -= 8;
      reasons.push(`Open interest falling ${change.toFixed(1)}%`);
    } else if (change < -3) {
      score -= 4;
      reasons.push(`Open interest down ${change.toFixed(1)}%`);
    }
  }

  // Long/short ratio from Binance global account data.
  if (typeof sentiment.longShortRatio === "number") {
    const ratio = sentiment.longShortRatio;
    if (ratio >= 1.25) {
      score -= 12;
      reasons.push(`Long/short ratio ${ratio.toFixed(2)} – aggressive long crowding`);
    } else if (ratio >= 1.1) {
      score -= 6;
      reasons.push(`Long/short ratio ${ratio.toFixed(2)} – longs dominant`);
    } else if (ratio <= 0.8) {
      score += 12;
      reasons.push(`Long/short ratio ${ratio.toFixed(2)} – shorts dominant`);
    } else if (ratio <= 0.9) {
      score += 6;
      reasons.push(`Long/short ratio ${ratio.toFixed(2)} – short-leaning`);
    }
  }

  // Liquidations data (if provided later) – currently neutral but keep hook.
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
