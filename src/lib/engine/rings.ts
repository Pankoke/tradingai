import { clamp } from "@/src/lib/math";

export type SetupRings = {
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

function computeEventScore(breakdown: Breakdown, patternType?: string | null): number {
  const volShock = breakdown.volatility !== undefined && breakdown.volatility !== null
    ? clampPercent(breakdown.volatility)
    : 50;
  const trend = clampPercent(breakdown.trend);
  const momentum = clampPercent(breakdown.momentum);
  const momentumEvent = clamp(Math.abs(trend - momentum) * 1.2, 0, 100);
  const patternValue =
    patternType && PATTERN_MAP[patternType.toLowerCase()]
      ? PATTERN_MAP[patternType.toLowerCase()]
      : breakdown.pattern ?? null;
  const patternEvent =
    patternType && PATTERN_MAP[patternType.toLowerCase()]
      ? PATTERN_MAP[patternType.toLowerCase()]
      : patternValue !== null
        ? clamp(Math.max(patternValue, 40), 0, 100)
        : 50;

  const eventScore = 0.4 * volShock + 0.35 * momentumEvent + 0.25 * patternEvent;
  return clamp(Math.round(eventScore), 0, 100);
}

function resolveEventScore(source: RingSource): number {
  if (source.breakdown) {
    return computeEventScore(source.breakdown, source.patternType ?? null);
  }
  if (typeof source.eventScore === "number" && !Number.isNaN(source.eventScore)) {
    return clampPercent(source.eventScore);
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

function computeRingsFromSource(source: RingSource): SetupRings {
  return {
    event: resolveEventScore(source),
    bias: resolveBiasScore(source),
    sentiment: resolveSentimentScore(source),
    orderflow: resolveOrderflowScore(source),
    confidence: resolveConfidence(source),
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
