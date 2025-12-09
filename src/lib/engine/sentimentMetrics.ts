import type { Asset } from "@/src/server/repositories/assetRepository";
import type { SentimentRawSnapshot } from "@/src/server/sentiment/SentimentProvider";

export type SentimentLabel =
  | "extreme_bearish"
  | "bearish"
  | "neutral"
  | "bullish"
  | "extreme_bullish";

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
  if (score >= 85) return "extreme_bullish";
  if (score >= 65) return "bullish";
  if (score <= 15) return "extreme_bearish";
  if (score <= 35) return "bearish";
  return "neutral";
}

function describeFunding(rate: number): string {
  const annualized = rate * 3 * 365 * 100;
  return `${annualized.toFixed(1)}% annualized`;
}

function pushReason(reasons: string[], text: string) {
  if (text && reasons.length < 6) {
    reasons.push(text);
  }
}

function normalizeScore(value?: number | null): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return clampScore(value);
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

  const biasScore = normalizeScore(sentiment.biasScore);
  if (typeof biasScore === "number") {
    if (biasScore >= 80) {
      score += 15;
      pushReason(reasons, `Bias very strong (${biasScore}) supports the trend`);
    } else if (biasScore >= 65) {
      score += 8;
      pushReason(reasons, `Bias strong (${biasScore}) leans bullish`);
    } else if (biasScore <= 20) {
      score -= 15;
      pushReason(reasons, `Bias very weak (${biasScore}) warns of distribution`);
    } else if (biasScore <= 35) {
      score -= 8;
      pushReason(reasons, `Bias soft (${biasScore}) leans bearish`);
    }
  }

  const trendScore = normalizeScore(sentiment.trendScore);
  if (typeof trendScore === "number") {
    if (trendScore >= 70) {
      score += 6;
      pushReason(reasons, `Trend firm (${trendScore})`);
    } else if (trendScore <= 30) {
      score -= 6;
      pushReason(reasons, `Trend weak (${trendScore})`);
    }
  }

  const momentumScore = normalizeScore(sentiment.momentumScore);
  if (typeof momentumScore === "number") {
    if (momentumScore >= 70) {
      score += 5;
      pushReason(reasons, `Momentum strong (${momentumScore})`);
    } else if (momentumScore <= 30) {
      score -= 5;
      pushReason(reasons, `Momentum fading (${momentumScore})`);
    }
  }

  const orderflowScore = normalizeScore(sentiment.orderflowScore);
  if (typeof orderflowScore === "number") {
    if (orderflowScore >= 70) {
      score += 4;
      pushReason(reasons, `Orderflow supportive (${orderflowScore})`);
    } else if (orderflowScore <= 30) {
      score -= 4;
      pushReason(reasons, `Orderflow light (${orderflowScore})`);
    }
  }

  const eventScore = normalizeScore(sentiment.eventScore);
  if (typeof eventScore === "number") {
    if (eventScore >= 65) {
      score -= 6;
      pushReason(reasons, `Event risk elevated (${eventScore})`);
    } else if (eventScore <= 35) {
      score += 3;
      pushReason(reasons, `Event calendar calm (${eventScore})`);
    }
  }

  if (typeof sentiment.rrr === "number") {
    if (sentiment.rrr >= 3) {
      score += 4;
      pushReason(reasons, `RRR attractive (${sentiment.rrr.toFixed(2)}:1)`);
    } else if (sentiment.rrr < 1.5) {
      score -= 7;
      pushReason(reasons, `RRR poor (${sentiment.rrr.toFixed(2)}:1)`);
    }
  }

  if (typeof sentiment.riskPercent === "number") {
    if (sentiment.riskPercent > 2.5) {
      score -= 6;
      pushReason(reasons, `Risk per trade high (${sentiment.riskPercent.toFixed(2)}%)`);
    } else if (sentiment.riskPercent <= 1.2) {
      score += 3;
      pushReason(reasons, `Risk per trade moderate (${sentiment.riskPercent.toFixed(2)}%)`);
    }
  }

  if (sentiment.volatilityLabel) {
    if (sentiment.volatilityLabel === "high") {
      score -= 5;
      pushReason(reasons, "Volatility high - tape fragile");
    } else if (sentiment.volatilityLabel === "low") {
      score += 2;
      pushReason(reasons, "Volatility low - controlled backdrop");
    }
  }

  if (typeof sentiment.driftPct === "number" && Math.abs(sentiment.driftPct) > 4) {
    score -= 4;
    pushReason(reasons, `Price drift ${sentiment.driftPct.toFixed(2)}% - re-check setup`);
  }

  if (typeof sentiment.fundingRate === "number") {
    const rate = sentiment.fundingRate;
    if (rate > 0.01) {
      score -= Math.min(12, Math.abs(rate) * 1200);
      pushReason(reasons, `High positive funding (${describeFunding(rate)})`);
    } else if (rate < -0.01) {
      score += Math.min(12, Math.abs(rate) * 1200);
      pushReason(reasons, `High negative funding (${describeFunding(rate)})`);
    }
  }

  if (typeof sentiment.openInterestChangePct === "number") {
    const change = sentiment.openInterestChangePct;
    if (change > 7) {
      score += 4;
      pushReason(reasons, `Open interest rising ${change.toFixed(1)}%`);
    } else if (change < -7) {
      score -= 4;
      pushReason(reasons, `Open interest falling ${change.toFixed(1)}%`);
    }
  }

  const finalScore = clampScore(score);
  const label = resolveLabel(finalScore);
  if (label === "extreme_bullish") {
    pushReason(reasons, "Extreme bullish sentiment");
  } else if (label === "bullish") {
    pushReason(reasons, "Sentiment leans bullish");
  } else if (label === "bearish") {
    pushReason(reasons, "Sentiment leans bearish");
  } else if (label === "extreme_bearish") {
    pushReason(reasons, "Extreme bearish sentiment");
  } else {
    pushReason(reasons, "Sentiment neutral");
  }

  return {
    score: finalScore,
    label,
    reasons,
    raw: sentiment,
  };
}

