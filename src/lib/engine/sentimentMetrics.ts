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

export const SENTIMENT_TUNING = {
  baseScore: 50,
  maxReasons: 6,
  labelThresholds: {
    extremeBullish: 85,
    bullish: 65,
    bearish: 35,
    extremeBearish: 15,
  },
  bias: {
    veryStrong: 80,
    strong: 65,
    soft: 35,
    veryWeak: 20,
    veryStrongBonus: 15,
    strongBonus: 8,
    weakPenalty: 8,
    veryWeakPenalty: 15,
  },
  trend: {
    strong: 70,
    weak: 30,
    bonus: 6,
    penalty: 6,
  },
  momentum: {
    strong: 70,
    weak: 30,
    bonus: 5,
    penalty: 5,
  },
  orderflow: {
    strong: 70,
    weak: 30,
    bonus: 4,
    penalty: 4,
  },
  event: {
    calm: 35,
    elevated: 65,
    calmBonus: 3,
    elevatedPenalty: 6,
  },
  rrr: {
    strong: 3,
    weak: 1.5,
    strongBonus: 4,
    weakPenalty: 7,
  },
  risk: {
    low: 1.2,
    high: 2.5,
    lowBonus: 3,
    highPenalty: 6,
  },
  volatility: {
    lowLabel: "low",
    highLabel: "high",
    lowBonus: 2,
    highPenalty: 5,
  },
  drift: {
    thresholdPct: 4,
    penalty: 4,
  },
} as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveLabel(score: number): SentimentLabel {
  const thresholds = SENTIMENT_TUNING.labelThresholds;
  if (score >= thresholds.extremeBullish) return "extreme_bullish";
  if (score >= thresholds.bullish) return "bullish";
  if (score <= thresholds.extremeBearish) return "extreme_bearish";
  if (score <= thresholds.bearish) return "bearish";
  return "neutral";
}

function pushReason(reasons: string[], text: string) {
  if (text && reasons.length < SENTIMENT_TUNING.maxReasons) {
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
  let score = SENTIMENT_TUNING.baseScore;

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
    if (biasScore >= SENTIMENT_TUNING.bias.veryStrong) {
      score += SENTIMENT_TUNING.bias.veryStrongBonus;
      pushReason(reasons, `Bias very strong (${biasScore}) supports the trade direction`);
    } else if (biasScore >= SENTIMENT_TUNING.bias.strong) {
      score += SENTIMENT_TUNING.bias.strongBonus;
      pushReason(reasons, `Bias strong (${biasScore}) leans bullish`);
    } else if (biasScore <= SENTIMENT_TUNING.bias.veryWeak) {
      score -= SENTIMENT_TUNING.bias.veryWeakPenalty;
      pushReason(reasons, `Bias very weak (${biasScore}) warns of exhaustion`);
    } else if (biasScore <= SENTIMENT_TUNING.bias.soft) {
      score -= SENTIMENT_TUNING.bias.weakPenalty;
      pushReason(reasons, `Bias soft (${biasScore}) leans bearish`);
    }
  }

  const trendScore = normalizeScore(sentiment.trendScore);
  if (typeof trendScore === "number") {
    if (trendScore >= SENTIMENT_TUNING.trend.strong) {
      score += SENTIMENT_TUNING.trend.bonus;
      pushReason(reasons, `Trend firm (${trendScore})`);
    } else if (trendScore <= SENTIMENT_TUNING.trend.weak) {
      score -= SENTIMENT_TUNING.trend.penalty;
      pushReason(reasons, `Trend weak (${trendScore})`);
    }
  }

  const momentumScore = normalizeScore(sentiment.momentumScore);
  if (typeof momentumScore === "number") {
    if (momentumScore >= SENTIMENT_TUNING.momentum.strong) {
      score += SENTIMENT_TUNING.momentum.bonus;
      pushReason(reasons, `Momentum strong (${momentumScore})`);
    } else if (momentumScore <= SENTIMENT_TUNING.momentum.weak) {
      score -= SENTIMENT_TUNING.momentum.penalty;
      pushReason(reasons, `Momentum fading (${momentumScore})`);
    }
  }

  const orderflowScore = normalizeScore(sentiment.orderflowScore);
  if (typeof orderflowScore === "number") {
    if (orderflowScore >= SENTIMENT_TUNING.orderflow.strong) {
      score += SENTIMENT_TUNING.orderflow.bonus;
      pushReason(reasons, `Orderflow supportive (${orderflowScore})`);
    } else if (orderflowScore <= SENTIMENT_TUNING.orderflow.weak) {
      score -= SENTIMENT_TUNING.orderflow.penalty;
      pushReason(reasons, `Orderflow light (${orderflowScore})`);
    }
  }

  const eventScore = normalizeScore(sentiment.eventScore);
  if (typeof eventScore === "number") {
    if (eventScore >= SENTIMENT_TUNING.event.elevated) {
      score -= SENTIMENT_TUNING.event.elevatedPenalty;
      pushReason(reasons, `Event risk elevated (${eventScore})`);
    } else if (eventScore <= SENTIMENT_TUNING.event.calm) {
      score += SENTIMENT_TUNING.event.calmBonus;
      pushReason(reasons, `Event calendar calm (${eventScore})`);
    }
  }

  if (typeof sentiment.rrr === "number") {
    if (sentiment.rrr >= SENTIMENT_TUNING.rrr.strong) {
      score += SENTIMENT_TUNING.rrr.strongBonus;
      pushReason(reasons, `RRR attractive (${sentiment.rrr.toFixed(2)}:1)`);
    } else if (sentiment.rrr < SENTIMENT_TUNING.rrr.weak) {
      score -= SENTIMENT_TUNING.rrr.weakPenalty;
      pushReason(reasons, `RRR poor (${sentiment.rrr.toFixed(2)}:1)`);
    }
  }

  if (typeof sentiment.riskPercent === "number") {
    if (sentiment.riskPercent > SENTIMENT_TUNING.risk.high) {
      score -= SENTIMENT_TUNING.risk.highPenalty;
      pushReason(reasons, `Risk per trade high (${sentiment.riskPercent.toFixed(2)}%)`);
    } else if (sentiment.riskPercent <= SENTIMENT_TUNING.risk.low) {
      score += SENTIMENT_TUNING.risk.lowBonus;
      pushReason(reasons, `Risk per trade moderate (${sentiment.riskPercent.toFixed(2)}%)`);
    }
  }

  if (sentiment.volatilityLabel) {
    if (sentiment.volatilityLabel === SENTIMENT_TUNING.volatility.highLabel) {
      score -= SENTIMENT_TUNING.volatility.highPenalty;
      pushReason(reasons, "Volatility high – tape fragile");
    } else if (sentiment.volatilityLabel === SENTIMENT_TUNING.volatility.lowLabel) {
      score += SENTIMENT_TUNING.volatility.lowBonus;
      pushReason(reasons, "Volatility low – controlled backdrop");
    }
  }

  if (
    typeof sentiment.driftPct === "number" &&
    Math.abs(sentiment.driftPct) > SENTIMENT_TUNING.drift.thresholdPct
  ) {
    score -= SENTIMENT_TUNING.drift.penalty;
    pushReason(reasons, `Price drift ${sentiment.driftPct.toFixed(2)}% – re-check setup`);
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

