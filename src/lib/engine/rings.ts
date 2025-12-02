import { clamp } from "@/src/lib/math";

export type SetupRingScores = {
  trendScore: number;
  eventScore: number;
  biasScore: number;
  sentimentScore: number;
  orderflowScore: number;
  confidenceScore: number;
};

export type SetupRings = SetupRingScores & {
  event: number;
  bias: number;
  sentiment: number;
  orderflow: number;
  confidence: number;
};

type Breakdown = {
  trend?: number | null;
  momentum?: number | null;
  volatility?: number | null;
  pattern?: number | null;
};

type RingSource = {
  breakdown?: Breakdown;
  patternType?: string | null;
  eventScore?: number | null;
  biasScore?: number | null;
  biasScoreAtTime?: number | null;
  sentimentScore?: number | null;
  balanceScore?: number | null;
  orderflowMode?: string | null;
  eventContext?: unknown | null;
  confidence?: number | null;
  direction?: "long" | "short" | "neutral" | null;
  trendScore?: number | null;
};

const PATTERN_MAP: Record<string, number> = {
  breakout: 85,
  "liquidity grab": 80,
  pullback: 65,
  "range rejection": 60,
  "trend continuation": 55,
};

const clampPercent = (value?: number | null, fallback = 50): number => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return fallback;
  }
  return clamp(Math.round(value), 0, 100);
};

const PATTERN_MAP_STAGE1: Record<string, number> = {
  breakout: 90,
  "liquidity grab": 80,
  "range rejection": 70,
  pullback: 60,
  "trend continuation": 55,
};

function computeVolComponent(volatility?: number | null): number {
  const volNorm = clampPercent(volatility);
  if (volNorm <= 40) {
    return 0;
  }
  const rawVol = (volNorm - 40) * 2;
  return clamp(Math.round(rawVol), 0, 100);
}

function computeRegimeComponent(trend?: number | null, momentum?: number | null): number {
  const trendNorm = clampPercent(trend);
  const momentumNorm = clampPercent(momentum);
  const trendStrength = Math.abs(trendNorm - 50);
  const divergence = Math.abs(trendNorm - momentumNorm);
  const regime = 0.5 * trendStrength + 0.5 * divergence;
  return clamp(Math.round(regime), 0, 100);
}

function computePatternComponent(breakdown?: Breakdown, patternType?: string | null): number {
  if (patternType) {
    const mapped = PATTERN_MAP_STAGE1[patternType.toLowerCase()];
    if (typeof mapped === "number") {
      return mapped;
    }
  }
  if (breakdown && breakdown.pattern !== undefined && breakdown.pattern !== null) {
    return clamp(Math.round(Math.max(30, Math.min(80, breakdown.pattern))), 0, 100);
  }
  return 50;
}

function computeMacroComponent(eventScore?: number | null): number {
  return clampPercent(eventScore);
}

function computeEventWithBreakdown(
  breakdown: Breakdown,
  patternType?: string | null,
  eventScore?: number | null,
): number {
  const volComponent = computeVolComponent(breakdown.volatility);
  const regimeComponent = computeRegimeComponent(breakdown.trend, breakdown.momentum);
  const patternComponent = computePatternComponent(breakdown, patternType);
  const macroComponent = computeMacroComponent(eventScore);
  const eventScoreValue =
    0.3 * volComponent +
    0.25 * regimeComponent +
    0.25 * patternComponent +
    0.2 * macroComponent;
  return clamp(Math.round(eventScoreValue), 0, 100);
}

function computeEventWithoutBreakdown(
  patternType?: string | null,
  eventScore?: number | null,
): number {
  const macroComponent = computeMacroComponent(eventScore);
  const patternComponent = computePatternComponent(undefined, patternType);
  const eventScoreValue = 0.6 * macroComponent + 0.4 * patternComponent;
  return clamp(Math.round(eventScoreValue), 0, 100);
}

function resolveEventScore(source: RingSource): number {
  if (source.breakdown) {
    return computeEventWithBreakdown(
      source.breakdown,
      source.patternType,
      source.eventScore,
    );
  }
  if (typeof source.eventScore === "number" && !Number.isNaN(source.eventScore)) {
    return computeEventWithoutBreakdown(source.patternType, source.eventScore);
  }
  return 50;
}

function resolveBiasScore(source: RingSource): number {
  const bias = source.biasScoreAtTime ?? source.biasScore;
  return clampPercent(bias);
}

function computeSentimentScore(source: RingSource): number {
  const directionBase =
    source.direction === "long" ? 60 : source.direction === "short" ? 40 : 50;
  const biasNorm = clampPercent(source.biasScoreAtTime ?? source.biasScore);
  const biasOffset = (biasNorm - 50) * 0.4;
  const trendNorm = clampPercent(source.breakdown?.trend);
  const momentumNorm = clampPercent(source.breakdown?.momentum);
  const energy = (trendNorm + momentumNorm) / 2;
  const energyOffset = (energy - 50) * 0.3;
  const sentimentRaw = directionBase + biasOffset + energyOffset;
  return clamp(Math.round(sentimentRaw), 0, 100);
}

function resolveSentimentScore(source: RingSource): number {
  if (source.breakdown || source.sentimentScore !== undefined) {
    return computeSentimentScore(source);
  }
  return clampPercent(source.sentimentScore);
}

function computeOrderflowScore(source: RingSource): number {
  const flowEnergy = computeOrderflowEnergy(source.breakdown);
  return clamp(Math.round(flowEnergy), 0, 100);
}

function computeOrderflowEnergy(breakdown?: Breakdown): number {
  const momentumNorm = clampPercent(breakdown?.momentum);
  const volNorm = clampPercent(breakdown?.volatility);
  return (2 * momentumNorm + volNorm) / 3;
}

function resolveOrderflowScore(source: RingSource): number {
  if (source.breakdown) {
    return computeOrderflowScore(source);
  }
  return clampPercent(source.balanceScore);
}

function resolveConfidence(source: RingSource): number {
  return clampPercent(source.confidence);
}

function resolveTrendScore(source: RingSource): number {
  if (typeof source.trendScore === "number" && !Number.isNaN(source.trendScore)) {
    return clampPercent(source.trendScore);
  }
  return clampPercent(source.breakdown?.trend);
}

function computeRingsFromSource(source: RingSource): SetupRings {
  const trendScore = resolveTrendScore(source);
  const eventScore = resolveEventScore(source);
  const biasScore = resolveBiasScore(source);
  const sentimentScore = resolveSentimentScore(source);
  const orderflowScore = resolveOrderflowScore(source);
  const confidenceScore = resolveConfidence(source);
  return {
    trendScore,
    eventScore,
    biasScore,
    sentimentScore,
    orderflowScore,
    confidenceScore,
    event: eventScore,
    bias: biasScore,
    sentiment: sentimentScore,
    orderflow: orderflowScore,
    confidence: confidenceScore,
  };
}

export function computeRingsForSnapshotItem(item: {
  scoreTrend?: number | null;
  scoreMomentum?: number | null;
  scoreVolatility?: number | null;
  scorePattern?: number | null;
  biasScore?: number | null;
  biasScoreAtTime?: number | null;
  sentimentScore?: number | null;
  balanceScore?: number | null;
  orderflowMode?: string | null;
  confidence?: number | null;
  direction?: "long" | "short" | "neutral" | null;
}): SetupRings {
  return computeRingsFromSource({
    breakdown: {
      trend: item.scoreTrend ?? null,
      momentum: item.scoreMomentum ?? null,
      volatility: item.scoreVolatility ?? null,
      pattern: item.scorePattern ?? null,
    },
    biasScore: item.biasScore,
    biasScoreAtTime: item.biasScoreAtTime,
    sentimentScore: item.sentimentScore,
    balanceScore: item.balanceScore,
    orderflowMode: item.orderflowMode,
    confidence: item.confidence,
    direction: item.direction ?? null,
  });
}

export function computeRingsForSetup(setup: RingSource): SetupRings {
  return computeRingsFromSource(setup);
}
