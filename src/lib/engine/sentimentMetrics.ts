import type { Asset } from "@/src/server/repositories/assetRepository";
import type { SentimentRawSnapshot } from "@/src/server/sentiment/SentimentProvider";
import type {
  SentimentDriverCategory,
  SentimentDriverSummary,
  SentimentFlag,
  SentimentLabel,
} from "@/src/lib/engine/types";

export type SentimentContributionId =
  | "bias"
  | "trend"
  | "momentum"
  | "orderflow"
  | "event"
  | "rrr"
  | "riskPercent"
  | "volatility"
  | "drift";

export type SentimentContribution = {
  id: SentimentContributionId;
  delta: number;
  reason?: string;
};

export type SentimentMetrics = {
  score: number;
  label: SentimentLabel;
  reasons: string[];
  raw?: SentimentRawSnapshot | null;
  contributions?: SentimentContribution[];
  flags?: SentimentFlag[];
  dominantDrivers?: SentimentDriverSummary[];
};

type LabelThresholds = {
  extremeBullish: number;
  bullish: number;
  bearish: number;
  extremeBearish: number;
};

type SentimentProfileKey = "default" | "crypto" | "fx" | "index" | "commodity";

type FactorWeights = {
  strong: number;
  weak: number;
  bonus: number;
  penalty: number;
};

export type SentimentProfile = {
  key: SentimentProfileKey;
  baseScore: number;
  reasonLimit: number;
  labelThresholds: LabelThresholds;
  bias: {
    veryStrong: number;
    strong: number;
    soft: number;
    veryWeak: number;
    veryStrongBonus: number;
    strongBonus: number;
    weakPenalty: number;
    veryWeakPenalty: number;
  };
  trend: FactorWeights;
  momentum: FactorWeights;
  orderflow: FactorWeights;
  event: {
    calm: number;
    elevated: number;
    calmBonus: number;
    elevatedPenalty: number;
  };
  rrr: {
    strong: number;
    weak: number;
    strongBonus: number;
    weakPenalty: number;
  };
  risk: {
    low: number;
    high: number;
    lowBonus: number;
    highPenalty: number;
  };
  volatility: {
    lowLabel: string;
    highLabel: string;
    lowBonus: number;
    highPenalty: number;
  };
  drift: {
    thresholdPct: number;
    penalty: number;
  };
};

type BuildParams = {
  asset: Asset;
  sentiment?: SentimentRawSnapshot | null;
};

const BASE_PROFILE: SentimentProfile = {
  key: "default",
  baseScore: 50,
  reasonLimit: 6,
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
    weak: 35,
    bonus: 6,
    penalty: 6,
  },
  momentum: {
    strong: 70,
    weak: 35,
    bonus: 5,
    penalty: 5,
  },
  orderflow: {
    strong: 70,
    weak: 35,
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
};

export const SENTIMENT_PROFILES: Record<SentimentProfileKey, SentimentProfile> = {
  default: BASE_PROFILE,
  crypto: {
    ...BASE_PROFILE,
    key: "crypto",
    bias: {
      ...BASE_PROFILE.bias,
      veryStrongBonus: 18,
      strongBonus: 10,
    },
    event: {
      ...BASE_PROFILE.event,
      elevatedPenalty: 4,
    },
    volatility: {
      ...BASE_PROFILE.volatility,
      highPenalty: 3,
    },
  },
  fx: {
    ...BASE_PROFILE,
    key: "fx",
    event: {
      ...BASE_PROFILE.event,
      elevatedPenalty: 8,
    },
    rrr: {
      ...BASE_PROFILE.rrr,
      strong: 2.2,
      weak: 1.2,
    },
  },
  index: {
    ...BASE_PROFILE,
    key: "index",
    trend: {
      ...BASE_PROFILE.trend,
      bonus: 5,
      penalty: 5,
    },
    volatility: {
      ...BASE_PROFILE.volatility,
      highPenalty: 4,
    },
  },
  commodity: {
    ...BASE_PROFILE,
    key: "commodity",
    event: {
      ...BASE_PROFILE.event,
      calmBonus: 4,
      elevatedPenalty: 7,
    },
  },
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveLabel(profile: SentimentProfile, score: number): SentimentLabel {
  const thresholds = profile.labelThresholds;
  if (score >= thresholds.extremeBullish) return "extreme_bullish";
  if (score >= thresholds.bullish) return "bullish";
  if (score <= thresholds.extremeBearish) return "extreme_bearish";
  if (score <= thresholds.bearish) return "bearish";
  return "neutral";
}

function normalizeScore(value?: number | null): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return clampScore(value);
}

function getProfileForAsset(asset: Asset): SentimentProfile {
  const key = asset.assetClass?.toLowerCase() as SentimentProfileKey | undefined;
  if (key && SENTIMENT_PROFILES[key]) {
    return SENTIMENT_PROFILES[key];
  }
  return SENTIMENT_PROFILES.default;
}

export function getSentimentProfileForAsset(asset: Asset): SentimentProfile {
  return getProfileForAsset(asset);
}

export function buildSentimentMetrics(params: BuildParams): SentimentMetrics {
  const profile = getProfileForAsset(params.asset);
  const reasons: string[] = [];
  const contributions: SentimentContribution[] = [];
  const totals: Record<SentimentContributionId, number> = {
    bias: 0,
    trend: 0,
    momentum: 0,
    orderflow: 0,
    event: 0,
    rrr: 0,
    riskPercent: 0,
    volatility: 0,
    drift: 0,
  };
  let score = profile.baseScore;

  const sentiment = params.sentiment;
  if (!sentiment) {
    reasons.push("No sentiment data available");
    return {
      score,
      label: resolveLabel(profile, score),
      reasons,
      raw: null,
      contributions,
      flags: ["low_conviction"],
    };
  }

  function registerContribution(
    id: SentimentContributionId,
    delta: number,
    reason?: string,
  ): void {
    if (!delta) return;
    score += delta;
    contributions.push({ id, delta, reason });
    totals[id] += delta;
    if (reason && reasons.length < profile.reasonLimit) {
      reasons.push(reason);
    }
  }

  const biasScore = normalizeScore(sentiment.biasScore);
  if (typeof biasScore === "number") {
    if (biasScore >= profile.bias.veryStrong) {
      registerContribution("bias", profile.bias.veryStrongBonus, `Bias very strong (${biasScore}) supports direction`);
    } else if (biasScore >= profile.bias.strong) {
      registerContribution("bias", profile.bias.strongBonus, `Bias strong (${biasScore})`);
    } else if (biasScore <= profile.bias.veryWeak) {
      registerContribution("bias", -profile.bias.veryWeakPenalty, `Bias very weak (${biasScore}) warns of exhaustion`);
    } else if (biasScore <= profile.bias.soft) {
      registerContribution("bias", -profile.bias.weakPenalty, `Bias soft (${biasScore})`);
    }
  }

  const trendScore = normalizeScore(sentiment.trendScore);
  if (typeof trendScore === "number") {
    if (trendScore >= profile.trend.strong) {
      registerContribution("trend", profile.trend.bonus, `Trend firm (${trendScore})`);
    } else if (trendScore <= profile.trend.weak) {
      registerContribution("trend", -profile.trend.penalty, `Trend weak (${trendScore})`);
    }
  }

  const momentumScore = normalizeScore(sentiment.momentumScore);
  if (typeof momentumScore === "number") {
    if (momentumScore >= profile.momentum.strong) {
      registerContribution("momentum", profile.momentum.bonus, `Momentum strong (${momentumScore})`);
    } else if (momentumScore <= profile.momentum.weak) {
      registerContribution("momentum", -profile.momentum.penalty, `Momentum fading (${momentumScore})`);
    }
  }

  const orderflowScore = normalizeScore(sentiment.orderflowScore);
  if (typeof orderflowScore === "number") {
    if (orderflowScore >= profile.orderflow.strong) {
      registerContribution("orderflow", profile.orderflow.bonus, `Orderflow supportive (${orderflowScore})`);
    } else if (orderflowScore <= profile.orderflow.weak) {
      registerContribution("orderflow", -profile.orderflow.penalty, `Orderflow light (${orderflowScore})`);
    }
  }

  const eventScore = normalizeScore(sentiment.eventScore);
  if (typeof eventScore === "number") {
    if (eventScore >= profile.event.elevated) {
      registerContribution("event", -profile.event.elevatedPenalty, `Event risk elevated (${eventScore})`);
    } else if (eventScore <= profile.event.calm) {
      registerContribution("event", profile.event.calmBonus, `Event calendar calm (${eventScore})`);
    }
  }

  if (typeof sentiment.rrr === "number") {
    if (sentiment.rrr >= profile.rrr.strong) {
      registerContribution("rrr", profile.rrr.strongBonus, `RRR attractive (${sentiment.rrr.toFixed(2)}:1)`);
    } else if (sentiment.rrr < profile.rrr.weak) {
      registerContribution("rrr", -profile.rrr.weakPenalty, `RRR weak (${sentiment.rrr.toFixed(2)}:1)`);
    }
  }

  if (typeof sentiment.riskPercent === "number") {
    if (sentiment.riskPercent > profile.risk.high) {
      registerContribution("riskPercent", -profile.risk.highPenalty, `Risk per trade high (${sentiment.riskPercent.toFixed(2)}%)`);
    } else if (sentiment.riskPercent <= profile.risk.low) {
      registerContribution("riskPercent", profile.risk.lowBonus, `Risk per trade moderate (${sentiment.riskPercent.toFixed(2)}%)`);
    }
  }

  if (sentiment.volatilityLabel) {
    if (sentiment.volatilityLabel === profile.volatility.highLabel) {
      registerContribution("volatility", -profile.volatility.highPenalty, "Volatility high – stay tactical");
    } else if (sentiment.volatilityLabel === profile.volatility.lowLabel) {
      registerContribution("volatility", profile.volatility.lowBonus, "Volatility low – calm tape");
    }
  }

  if (
    typeof sentiment.driftPct === "number" &&
    Math.abs(sentiment.driftPct) > profile.drift.thresholdPct
  ) {
    registerContribution("drift", -profile.drift.penalty, `Price drift ${sentiment.driftPct.toFixed(2)}% – re-check setup`);
  }

  const finalScore = clampScore(score);
  const label = resolveLabel(profile, finalScore);

  if (reasons.length < profile.reasonLimit) {
    reasons.push(`Overall sentiment ${label.replace("_", " ")} (${finalScore})`);
  }

  const flags = buildFlags({ profile, label, score: finalScore, totals, raw: sentiment });
  const dominantDrivers = buildDominantDrivers(totals);

  return {
    score: finalScore,
    label,
    reasons,
    raw: { ...sentiment, profileKey: sentiment.profileKey ?? profile.key, baseScore: profile.baseScore },
    contributions: contributions.length ? contributions : undefined,
    flags: flags.length ? flags : undefined,
    dominantDrivers: dominantDrivers.length ? dominantDrivers : undefined,
  };
}

type FlagParams = {
  profile: SentimentProfile;
  label: SentimentLabel;
  score: number;
  totals: Record<SentimentContributionId, number>;
  raw: SentimentRawSnapshot;
};

function buildFlags(params: FlagParams): SentimentFlag[] {
  const flags: SentimentFlag[] = [];
  const { label, totals, raw, score } = params;

  const trendImpact = totals.trend;
  const biasImpact = totals.bias;
  const eventImpact = totals.event;
  const rrrImpact = totals.rrr;
  const riskImpact = totals.riskPercent;

  const isBullish = label === "bullish" || label === "extreme_bullish";
  const isBearish = label === "bearish" || label === "extreme_bearish";

  if (isBullish && trendImpact > 3) flags.push("supports_trend");
  if (isBullish && biasImpact > 4) flags.push("supports_bias");
  if (isBearish && trendImpact < -3) flags.push("supports_trend");
  if (isBearish && biasImpact < -4) flags.push("supports_bias");

  if (isBullish && trendImpact < -3) flags.push("contrarian_to_trend");
  if (isBullish && biasImpact < -4) flags.push("contrarian_to_bias");
  if (isBearish && trendImpact > 3) flags.push("contrarian_to_trend");
  if (isBearish && biasImpact > 4) flags.push("contrarian_to_bias");

  if (eventImpact < -3) flags.push("event_capped");

  if (rrrImpact > 3 && !isBullish) flags.push("rrr_mismatch");
  if (rrrImpact < -3 && isBullish) flags.push("rrr_mismatch");

  if (riskImpact < -4 && isBullish) flags.push("high_risk_crowded");

  const totalMagnitude = Object.values(totals).reduce((acc, value) => acc + Math.abs(value), 0);
  if (Math.abs(score - params.profile.baseScore) < 5 && totalMagnitude < 6) {
    flags.push("low_conviction");
  }

  return Array.from(new Set(flags));
}

function buildDominantDrivers(
  totals: Record<SentimentContributionId, number>,
): SentimentDriverSummary[] {
  return Object.entries(totals)
    .map(([id, contribution]) => ({
      category: mapContributionIdToDriver(id as SentimentContributionId),
      contribution,
    }))
    .filter((entry) => entry.contribution !== 0)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3);
}

function mapContributionIdToDriver(id: SentimentContributionId): SentimentDriverCategory {
  if (id === "riskPercent") return "risk";
  return id;
}
