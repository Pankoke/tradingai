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
  const atTime =
    typeof source.biasScoreAtTime === "number" && !Number.isNaN(source.biasScoreAtTime)
      ? source.biasScoreAtTime
      : undefined;
  const baseline =
    typeof source.biasScore === "number" && !Number.isNaN(source.biasScore)
      ? source.biasScore
      : undefined;
  if (atTime !== undefined && baseline !== undefined) {
    const combined = 0.7 * atTime + 0.3 * baseline;
    return clampPercent(combined);
  }
  if (atTime !== undefined) {
    return clampPercent(atTime);
  }
  if (baseline !== undefined) {
    return clampPercent(baseline);
  }
  return 50;
}

const directionComponent = (dir?: RingSource["direction"]): number => {
  if (dir === "long") return 55;
  if (dir === "short") return 45;
  return 50;
};

const biasComponentValue = (source: RingSource): number => {
  const biasNorm = clampPercent(source.biasScoreAtTime ?? source.biasScore);
  const comp = 50 + 0.6 * (biasNorm - 50);
  return clamp(Math.round(comp), 0, 100);
};

const energyComponentValue = (breakdown?: Breakdown): number => {
  const trendNorm = clampPercent(breakdown?.trend);
  const momentumNorm = clampPercent(breakdown?.momentum);
  const energy = (2 * momentumNorm + trendNorm) / 3;
  const value = 50 + 0.5 * (energy - 50);
  return clamp(Math.round(value), 0, 100);
};

const macroComponentValue = (eventScore?: number | null): number => {
  const macroNorm = clampPercent(eventScore);
  const value = 50 + 0.2 * (macroNorm - 50);
  return clamp(Math.round(value), 0, 100);
};

function resolveSentimentWithBreakdown(source: RingSource): number {
  const dirComp = directionComponent(source.direction);
  const biasComp = biasComponentValue(source);
  const energyComp = energyComponentValue(source.breakdown);
  const macroComp = macroComponentValue(source.eventScore);
  const raw =
    0.2 * dirComp + 0.4 * biasComp + 0.3 * energyComp + 0.1 * macroComp;
  return clamp(Math.round(raw), 0, 100);
}

function resolveSentimentWithoutBreakdown(source: RingSource): number {
  const dirComp = directionComponent(source.direction);
  const biasComp = biasComponentValue(source);
  const macroComp = macroComponentValue(source.eventScore);
  if (typeof source.sentimentScore === "number" && !Number.isNaN(source.sentimentScore)) {
    const precomputed = clampPercent(source.sentimentScore);
    const raw =
      0.6 * precomputed + 0.25 * biasComp + 0.1 * dirComp + 0.05 * macroComp;
    return clamp(Math.round(raw), 0, 100);
  }
  const raw = 0.5 * biasComp + 0.3 * dirComp + 0.2 * macroComp;
  return clamp(Math.round(raw), 0, 100);
}

function resolveSentimentScore(source: RingSource): number {
  if (source.breakdown) {
    return resolveSentimentWithBreakdown(source);
  }
  if (typeof source.sentimentScore === "number" && !Number.isNaN(source.sentimentScore)) {
    return resolveSentimentWithoutBreakdown(source);
  }
  if (typeof source.biasScoreAtTime === "number" || typeof source.biasScore === "number") {
    return resolveSentimentWithoutBreakdown(source);
  }
  return 50;
}

function computeOrderflowEnergy(breakdown?: Breakdown): number {
  const momentumNorm = clampPercent(breakdown?.momentum);
  const volNorm = clampPercent(breakdown?.volatility);
  return (2 * momentumNorm + volNorm) / 3;
}

function energyComponent(breakdown?: Breakdown): number {
  const rawEnergy = computeOrderflowEnergy(breakdown);
  const value = 50 + 0.6 * (rawEnergy - 50);
  return clamp(Math.round(value), 0, 100);
}

function resolveDirectionTilt(direction?: RingSource["direction"]): number {
  if (direction === "long") return 5;
  if (direction === "short") return -5;
  return 0;
}

const MODE_DELTA_MAP: Record<string, number> = {
  trending: 5,
  choppy: -5,
  "mean-reversion": 0,
};

function resolveModeDelta(source: RingSource): number {
  if (!source.orderflowMode) return 0;
  const key = source.orderflowMode.toLowerCase();
  return MODE_DELTA_MAP[key] ?? 0;
}

function resolveOrderflowScore(source: RingSource): number {
  if (source.breakdown) {
    const base = energyComponent(source.breakdown);
    const tilt = resolveDirectionTilt(source.direction);
    const modeDelta = resolveModeDelta(source);
    return clamp(Math.round(base + tilt + modeDelta), 0, 100);
  }
  if (typeof source.balanceScore === "number" && !Number.isNaN(source.balanceScore)) {
    const flowFromBalance = clampPercent(source.balanceScore);
    const fallback = 50 + 0.4 * (flowFromBalance - 50);
    return clamp(Math.round(fallback), 0, 100);
  }
  return 50;
}

function normalizeConfidenceInputs(source: RingSource) {
  const eventNorm = clampPercent(resolveEventScore(source));
  const biasNorm = clampPercent(resolveBiasScore(source));
  const sentimentNorm = clampPercent(resolveSentimentScore(source));
  const orderflowNorm = clampPercent(resolveOrderflowScore(source));
  const trendNorm = clampPercent(resolveTrendScore(source));
  return { eventNorm, biasNorm, sentimentNorm, orderflowNorm, trendNorm };
}

function strengthComponent(eventNorm: number, biasNorm: number, sentimentNorm: number): number {
  const strength = (eventNorm + biasNorm + sentimentNorm) / 3;
  const value = 50 + 0.6 * (strength - 50);
  return clamp(Math.round(value), 0, 100);
}

function consistencyComponent(values: number[]): number {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + (val - avg) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return clamp(Math.round(100 - stdDev), 0, 100);
}

function coherenceComponent(biasNorm: number, sentimentNorm: number): number {
  const directionImpact = 0.5 * biasNorm + 0.5 * sentimentNorm;
  const value = 50 + 0.4 * (directionImpact - 50);
  return clamp(Math.round(value), 0, 100);
}

function stabilityComponent(volatility?: number | null): number {
  const volNorm = clampPercent(volatility);
  const value = 100 - Math.abs(volNorm - 50) * 1.2;
  return clamp(Math.round(value), 0, 100);
}

function resolveConfidence(source: RingSource): number {
  const { eventNorm, biasNorm, sentimentNorm, orderflowNorm, trendNorm } =
    normalizeConfidenceInputs(source);
  const strengthComp = strengthComponent(eventNorm, biasNorm, sentimentNorm);
  const consistencyComp = consistencyComponent([
    eventNorm,
    biasNorm,
    sentimentNorm,
    orderflowNorm,
    trendNorm,
  ]);
  const coherenceComp = coherenceComponent(biasNorm, sentimentNorm);
  const stabilityComp = source.breakdown
    ? stabilityComponent(source.breakdown.volatility)
    : 50;
  const stageScore =
    0.4 * strengthComp + 0.3 * consistencyComp + 0.2 * coherenceComp + 0.1 * stabilityComp;
  if (source.breakdown) {
    return clamp(Math.round(stageScore), 0, 100);
  }
  if (typeof source.confidence === "number" && !Number.isNaN(source.confidence)) {
    const precomputed = clampPercent(source.confidence);
    const combined =
      0.6 * precomputed + 0.2 * strengthComp + 0.2 * consistencyComp;
    return clamp(Math.round(combined), 0, 100);
  }
  const hasSignal =
    typeof source.eventScore === "number" ||
    typeof source.biasScore === "number" ||
    typeof source.biasScoreAtTime === "number" ||
    typeof source.sentimentScore === "number" ||
    typeof source.orderflowMode === "string" ||
    typeof source.trendScore === "number";
  if (hasSignal) {
    return clamp(Math.round(stageScore), 0, 100);
  }
  return 50;
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

  if (process.env.DEBUG_BIAS === "1") {
    console.log("[Rings:bias]", {
      biasScore: source.biasScore,
      biasScoreAtTime: source.biasScoreAtTime,
      ringBias: biasScore,
    });
  }
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
