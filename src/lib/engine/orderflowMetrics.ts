import type { CandleTimeframe } from "@/src/domain/market-data/types";

export type OrderflowMode = "buyers" | "sellers" | "balanced";

type OrderflowProfileId = "default" | "crypto" | "index" | "fx" | "commodity";
type NonCryptoProfileId = Exclude<OrderflowProfileId, "crypto">;

export type OrderflowFlag =
  | "orderflow_trend_alignment"
  | "orderflow_trend_conflict"
  | "orderflow_bias_alignment"
  | "orderflow_bias_conflict"
  | "volume_surge"
  | "volume_dry"
  | "choppy"
  | "expansion";

export type OrderflowReasonCategory =
  | "volume"
  | "price_action"
  | "structure"
  | "trend_alignment"
  | "trend_conflict";

export interface OrderflowReasonDetail {
  category: OrderflowReasonCategory;
  text: string;
}

export type MarketTimeframe = CandleTimeframe;

export type CandleLike = {
  timestamp: Date;
  close: number | string;
  high?: number | string;
  low?: number | string;
  volume?: number | string | null;
};

const INTRADAY_PROFILE_TUNING = {
  default: {
    id: "default" as const,
    volumeStrongThreshold: 1.4,
    volumeStrongBonus: 0,
    lowConsistencyThreshold: 0.2,
    lowConsistencyPenalty: 0,
    expansionLowThreshold: 0.35,
    expansionLowBonus: 0,
    expansionHighThreshold: 0.75,
    expansionHighPenalty: 0,
  },
  crypto: {
    id: "crypto" as const,
    volumeStrongThreshold: 1.3,
    volumeStrongBonus: 4,
    lowConsistencyThreshold: 0.2,
    lowConsistencyPenalty: 6,
    expansionLowThreshold: 0.4,
    expansionLowBonus: 3,
    expansionHighThreshold: 0.8,
    expansionHighPenalty: 3,
  },
};

export interface OrderflowMetrics {
  flowScore: number;
  mode: OrderflowMode;
  clv: number; // Close location value (-100..100)
  relVolume: number; // multiple of average volume
  expansion: number; // 0..100 normalized expansion score
  consistency: number; // 0..100 dominance of one flow direction
  reasons: string[];
  reasonDetails?: OrderflowReasonDetail[];
  flags?: OrderflowFlag[];
  meta?: {
    profile?: OrderflowProfileId;
    timeframeSamples: Record<MarketTimeframe, number>;
    context?: {
      trendScore?: number | null;
      biasScore?: number | null;
    };
  };
}

export const ORDERFLOW_TIMEFRAMES: MarketTimeframe[] = ["4H", "1H", "15m"];

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampPercent = (value: number | undefined | null): number => {
  if (typeof value !== "number" || Number.isNaN(value)) return 50;
  return clamp(Math.round(value), 0, 100);
};

type DailyProfileConfig = {
  id: NonCryptoProfileId;
  lookbackDays: number;
  minSamples: number;
  multiClvWindow: number;
  volumeLookback: number;
  rangeLookback: number;
  clvWeight: number;
  multiClvWeight: number;
  volumeWeight: number;
  rangeWeight: number;
  trendWeight: number;
  strongClvThreshold: number;
  volumeSurgeThreshold: number;
  volumeDryThreshold: number;
  expansionThreshold: number;
  choppyWindow: number;
  choppyTolerance: number;
};

const DAILY_PROFILE_CONFIG: Record<NonCryptoProfileId, DailyProfileConfig> = {
  default: {
    id: "default",
    lookbackDays: 60,
    minSamples: 25,
    multiClvWindow: 5,
    volumeLookback: 30,
    rangeLookback: 20,
    clvWeight: 30,
    multiClvWeight: 15,
    volumeWeight: 20,
    rangeWeight: 15,
    trendWeight: 10,
    strongClvThreshold: 0.15,
    volumeSurgeThreshold: 1.25,
    volumeDryThreshold: 0.8,
    expansionThreshold: 1.35,
    choppyWindow: 6,
    choppyTolerance: 0.35,
  },
  index: {
    id: "index",
    lookbackDays: 60,
    minSamples: 25,
    multiClvWindow: 5,
    volumeLookback: 30,
    rangeLookback: 20,
    clvWeight: 30,
    multiClvWeight: 15,
    volumeWeight: 22,
    rangeWeight: 15,
    trendWeight: 12,
    strongClvThreshold: 0.15,
    volumeSurgeThreshold: 1.3,
    volumeDryThreshold: 0.75,
    expansionThreshold: 1.4,
    choppyWindow: 6,
    choppyTolerance: 0.35,
  },
  fx: {
    id: "fx",
    lookbackDays: 50,
    minSamples: 25,
    multiClvWindow: 6,
    volumeLookback: 25,
    rangeLookback: 20,
    clvWeight: 26,
    multiClvWeight: 14,
    volumeWeight: 15,
    rangeWeight: 18,
    trendWeight: 12,
    strongClvThreshold: 0.12,
    volumeSurgeThreshold: 1.2,
    volumeDryThreshold: 0.85,
    expansionThreshold: 1.3,
    choppyWindow: 7,
    choppyTolerance: 0.4,
  },
  commodity: {
    id: "commodity",
    lookbackDays: 60,
    minSamples: 25,
    multiClvWindow: 5,
    volumeLookback: 30,
    rangeLookback: 20,
    clvWeight: 28,
    multiClvWeight: 16,
    volumeWeight: 22,
    rangeWeight: 18,
    trendWeight: 12,
    strongClvThreshold: 0.14,
    volumeSurgeThreshold: 1.35,
    volumeDryThreshold: 0.8,
    expansionThreshold: 1.45,
    choppyWindow: 6,
    choppyTolerance: 0.35,
  },
};

interface NormalizedCandle {
  timestamp: Date;
  close: number;
  high: number;
  low: number;
  volume: number;
}

function normalizeCandles(candles: CandleLike[]): NormalizedCandle[] {
  return candles
    .slice()
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .map((candle) => ({
      timestamp: candle.timestamp,
      close: Number(candle.close),
      high: Number(candle.high),
      low: Number(candle.low),
      volume: Number(candle.volume ?? 0),
    }))
    .filter((item) => Number.isFinite(item.close) && Number.isFinite(item.volume));
}

function computeClv(candle: NormalizedCandle): number {
  const range = candle.high - candle.low;
  if (range <= 0) return 0;
  return clamp((2 * candle.close - candle.low - candle.high) / range, -1, 1);
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeRelativeVolume(series: NormalizedCandle[], lookback = 40): number {
  if (!series.length) return 1;
  const avgVol = average(series.slice(0, lookback).map((c) => c.volume));
  if (avgVol <= 0) return 1;
  return clamp(series[0].volume / avgVol, 0.2, 5);
}

function computeAtr(series: NormalizedCandle[], length = 30): number {
  if (series.length < 2) return 0;
  const atrValues: number[] = [];
  for (let i = 0; i < Math.min(series.length - 1, length); i += 1) {
    const current = series[i];
    const prev = series[i + 1];
    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close),
    );
    atrValues.push(trueRange);
  }
  return average(atrValues);
}

function computeConsistency(clvSeries: number[]): number {
  if (!clvSeries.length) return 0.5;
  const positives = clvSeries.filter((value) => value >= 0).length;
  const negatives = clvSeries.length - positives;
  const dominance = Math.abs(positives - negatives) / clvSeries.length;
  return dominance;
}

export async function buildOrderflowMetrics(params: {
  candlesByTimeframe: Partial<Record<MarketTimeframe, CandleLike[]>>;
  timeframes?: MarketTimeframe[];
  trendScore?: number | null;
  biasScore?: number | null;
  assetClass?: string | null;
  now?: Date;
  neutralizeStaleMinutes?: number;
}): Promise<OrderflowMetrics> {
  const profileId = resolveOrderflowProfile(params.assetClass);

  if (profileId !== "crypto") {
    const dailyCandles = normalizeCandles(params.candlesByTimeframe["1D"] ?? []);
    return buildDailyOrderflowMetrics({
      candles: dailyCandles,
      profileId: profileId as NonCryptoProfileId,
      trendScore: params.trendScore,
      biasScore: params.biasScore,
    });
  }

  const requestedTfs = params.timeframes ?? ORDERFLOW_TIMEFRAMES;
  const uniqueTfs = Array.from(new Set(requestedTfs)).filter((tf) => ORDERFLOW_TIMEFRAMES.includes(tf));
  const timeframeSamples: Record<MarketTimeframe, number> = {
    "1D": 0,
    "1W": 0,
    "4H": 0,
    "1H": 0,
    "15m": 0,
  };

  const candleMap = new Map<MarketTimeframe, NormalizedCandle[]>();

  uniqueTfs.forEach((timeframe) => {
    const raw = params.candlesByTimeframe[timeframe] ?? [];
    const normalized = normalizeCandles(raw);
    candleMap.set(timeframe, normalized);
    timeframeSamples[timeframe] = normalized.length;
  });

  const fifteen = candleMap.get("15m") ?? [];
  const oneHour = candleMap.get("1H") ?? [];
  const fourHour = candleMap.get("4H") ?? [];
  const latestIntradayTs = Math.max(
    ...(fifteen.map((c) => c.timestamp.getTime()) ?? []),
    ...(oneHour.map((c) => c.timestamp.getTime()) ?? []),
    ...(fourHour.map((c) => c.timestamp.getTime()) ?? []),
  );

  const isStale =
    Number.isFinite(latestIntradayTs) &&
    typeof params.neutralizeStaleMinutes === "number" &&
    params.now instanceof Date &&
    params.now.getTime() - latestIntradayTs > params.neutralizeStaleMinutes * 60 * 1000;

  if (!fifteen.length && !oneHour.length && !fourHour.length) {
    return {
      flowScore: 50,
      mode: "balanced",
      clv: 0,
      relVolume: 1,
      expansion: 0,
      consistency: 50,
      reasons: ["Insufficient intraday data for orderflow"],
      reasonDetails: [
        { category: "structure", text: "Insufficient intraday data for orderflow" },
      ],
      meta: {
        profile: profileId,
        timeframeSamples,
        context: {
          trendScore: params.trendScore ?? null,
          biasScore: params.biasScore ?? null,
        },
      },
    };
  }

  if (isStale) {
    return {
      flowScore: 50,
      mode: "balanced",
      clv: 0,
      relVolume: 1,
      expansion: 0,
      consistency: 50,
      reasons: ["Stale intraday orderflow data"],
      meta: {
        profile: profileId,
        timeframeSamples,
        context: {
          trendScore: params.trendScore ?? null,
          biasScore: params.biasScore ?? null,
        },
      },
    };
  }

  const profile = INTRADAY_PROFILE_TUNING.crypto;

  const clvSeries = (fifteen.length ? fifteen : oneHour).map(computeClv);
  const clvAvg = clamp(average(clvSeries), -1, 1);

  const relVolume = computeRelativeVolume(fifteen.length ? fifteen : oneHour, 40);

  const shortAtr = computeAtr(oneHour.length ? oneHour : fifteen, 30);
  const baseAtr = computeAtr(fourHour.length ? fourHour : oneHour, 30);
  const expansionRatio = baseAtr > 0 ? (shortAtr - baseAtr) / baseAtr : 0;
  const expansionNormalized = clamp((expansionRatio + 1) / 2, 0, 1);

  const consistency = computeConsistency(clvSeries);

  let flowScore = 50;
  flowScore += clvAvg * 30;
  flowScore += (relVolume - 1) * 25;
  flowScore += (expansionNormalized - 0.5) * 30;
  flowScore += (consistency - 0.5) * 30;
  flowScore = clamp(Math.round(flowScore), 0, 100);

  let mode: OrderflowMode = "balanced";
  if (clvAvg > 0.12 && relVolume > 1.05) {
    mode = "buyers";
  } else if (clvAvg < -0.12 && relVolume > 1.05) {
    mode = "sellers";
  }

  const reasons: string[] = [];
  const reasonDetails: OrderflowReasonDetail[] = [];
  const MAX_REASON_DETAILS = 4;
  const reasonDedup = new Set<string>();
  const pushReason = (category: OrderflowReasonCategory, text: string) => {
    if (reasonDedup.has(text) || reasonDetails.length >= MAX_REASON_DETAILS) {
      return;
    }
    reasonDedup.add(text);
    reasonDetails.push({ category, text });
    reasons.push(text);
  };

  if (Math.abs(clvAvg) >= 0.1) {
    pushReason("price_action", "CLV skewed; price favors one side");
  }
  if (relVolume >= 1.1) {
    pushReason("volume", "Volume outpaces recent average");
  } else if (relVolume <= 0.9) {
    pushReason("volume", "Volume lighter than average");
  }
  if (expansionRatio >= 0.15) {
    pushReason("structure", "Range expansion active");
  } else if (expansionRatio <= -0.15) {
    pushReason("structure", "Range contraction");
  }
  if (consistency >= 0.7) {
    pushReason("structure", "Flow consistent across intraday candles");
  } else if (consistency <= 0.3) {
    pushReason("structure", "Flow choppy / mixed");
  }
  if (!reasonDetails.length) {
    pushReason("structure", "Orderflow neutral");
  }

  if (profile.volumeStrongBonus && relVolume > profile.volumeStrongThreshold) {
    flowScore += profile.volumeStrongBonus;
    pushReason("volume", "Crypto flow: strong participation");
  }

  if (
    profile.lowConsistencyPenalty &&
    consistency <= profile.lowConsistencyThreshold
  ) {
    flowScore -= profile.lowConsistencyPenalty;
    pushReason("structure", "Crypto flow choppy / mixed");
  }

  if (
    profile.expansionLowBonus &&
    expansionNormalized <= profile.expansionLowThreshold &&
    (params.trendScore ?? 0) >= 55 &&
    (params.biasScore ?? 0) >= 55
  ) {
    flowScore += profile.expansionLowBonus;
    pushReason("structure", "Healthy consolidation despite strong backdrop");
  }

  if (
    profile.expansionHighPenalty &&
    expansionNormalized >= profile.expansionHighThreshold
  ) {
    flowScore -= profile.expansionHighPenalty;
    pushReason("structure", "Overextended expansion – watch for reversals");
  }

  const flags = new Set<OrderflowFlag>();
  const trendScore = params.trendScore ?? null;
  const biasScore = params.biasScore ?? null;

  if (typeof trendScore === "number") {
    if (trendScore >= 60) {
      if (mode === "buyers") flags.add("orderflow_trend_alignment");
      if (mode === "sellers") flags.add("orderflow_trend_conflict");
    } else if (trendScore <= 40) {
      if (mode === "sellers") {
        flags.add("orderflow_trend_alignment");
      } else if (mode === "buyers") {
        flags.add("orderflow_trend_conflict");
      }
    }
  }

  if (typeof biasScore === "number") {
    if (biasScore >= 60) {
      if (mode === "buyers") flags.add("orderflow_bias_alignment");
      if (mode === "sellers") flags.add("orderflow_bias_conflict");
    } else if (biasScore <= 40) {
      if (mode === "sellers") {
        flags.add("orderflow_bias_alignment");
      } else if (mode === "buyers") {
        flags.add("orderflow_bias_conflict");
      }
    }
  }

  if (relVolume >= 1.4) {
    flags.add("volume_surge");
  } else if (relVolume <= 0.7) {
    flags.add("volume_dry");
  }

  if (consistency <= 0.2) {
    flags.add("choppy");
  }

  if (expansionNormalized >= 0.6) {
    flags.add("expansion");
  }

  if (flags.has("orderflow_trend_alignment")) {
    pushReason("trend_alignment", "Flow aligns with prevailing trend");
  }
  if (flags.has("orderflow_trend_conflict")) {
    pushReason("trend_conflict", "Flow diverges from prevailing trend");
  }
  if (flags.has("orderflow_bias_conflict") && !flags.has("orderflow_trend_conflict")) {
    pushReason("trend_conflict", "Flow conflicts with directional bias");
  }

  return {
    flowScore,
    mode,
    clv: Number((clvAvg * 100).toFixed(1)),
    relVolume: Number(relVolume.toFixed(2)),
    expansion: Number((expansionNormalized * 100).toFixed(1)),
    consistency: Number((consistency * 100).toFixed(1)),
    reasons,
    reasonDetails,
    flags: flags.size ? Array.from(flags) : undefined,
    meta: {
      profile: profile.id,
      timeframeSamples,
      context: {
        trendScore,
        biasScore,
      },
    },
  };
}

async function buildDailyOrderflowMetrics(params: {
  candles: NormalizedCandle[];
  profileId: NonCryptoProfileId;
  trendScore?: number | null;
  biasScore?: number | null;
}): Promise<OrderflowMetrics> {
  const config = DAILY_PROFILE_CONFIG[params.profileId] ?? DAILY_PROFILE_CONFIG.default;
  const normalized = params.candles.slice(0, config.lookbackDays);
  const timeframeSamples: Record<MarketTimeframe, number> = {
    "1W": 0,
    "1D": normalized.length,
    "4H": 0,
    "1H": 0,
    "15m": 0,
  };

  const context = {
    trendScore: params.trendScore ?? null,
    biasScore: params.biasScore ?? null,
  };

  if (normalized.length < config.minSamples) {
    return {
      flowScore: 50,
      mode: "balanced",
      clv: 0,
      relVolume: 1,
      expansion: 0,
      consistency: 50,
      reasons: ["Insufficient daily history for robust flow signal"],
      reasonDetails: [
        { category: "structure", text: "Insufficient daily history for robust flow signal" },
      ],
      meta: {
        profile: config.id,
        timeframeSamples,
        context,
      },
    };
  }

  const reasons: string[] = [];
  const reasonDetails: OrderflowReasonDetail[] = [];
  const reasonDedup = new Set<string>();
  const pushReason = (category: OrderflowReasonCategory, text: string) => {
    if (reasonDetails.length >= 4 || reasonDedup.has(text)) return;
    reasonDedup.add(text);
    reasonDetails.push({ category, text });
    reasons.push(text);
  };

  const clvSeries = normalized.map(computeClv);
  const latestClv = clvSeries[0] ?? 0;
  const multiClv =
    clvSeries
      .slice(0, config.multiClvWindow)
      .reduce((sum, val) => sum + val, 0) /
    Math.max(1, Math.min(config.multiClvWindow, clvSeries.length));
  const relVolume = computeRelativeVolume(normalized, config.volumeLookback);
  const avgRange = computeAverageRange(normalized, config.rangeLookback);
  const latestRange = normalized[0].high - normalized[0].low;
  const rangeRatio = avgRange > 0 ? latestRange / avgRange : 1;
  const rangeNormalized = clamp(rangeRatio, 0, 2);
  const closes = normalized.map((c) => c.close);
  const longTrend = computeDailyTrendScore(closes);
  const trendComponent = (longTrend - 50) / 50;
  const consistencyScore =
    computeConsistency(clvSeries.slice(0, config.choppyWindow)) * 100;
  const isChoppy = detectChoppyFlow(clvSeries, config.choppyWindow, config.choppyTolerance);

  let flowScore = 50;
  flowScore += latestClv * config.clvWeight;
  flowScore += multiClv * config.multiClvWeight;
  flowScore += (relVolume - 1) * config.volumeWeight;
  flowScore += (rangeRatio - 1) * config.rangeWeight;
  flowScore += trendComponent * config.trendWeight;
  flowScore = clamp(Math.round(flowScore), 0, 100);

  let mode: OrderflowMode = "balanced";
  if (flowScore >= 60 && latestClv >= config.strongClvThreshold) {
    mode = "buyers";
  } else if (flowScore <= 40 && latestClv <= -config.strongClvThreshold) {
    mode = "sellers";
  }

  const flags = new Set<OrderflowFlag>();

  if (typeof context.trendScore === "number") {
    if (context.trendScore >= 60) {
      if (mode === "buyers") flags.add("orderflow_trend_alignment");
      if (mode === "sellers") flags.add("orderflow_trend_conflict");
    } else if (context.trendScore <= 40) {
      if (mode === "sellers") flags.add("orderflow_trend_alignment");
      if (mode === "buyers") flags.add("orderflow_trend_conflict");
    }
  }

  if (typeof context.biasScore === "number") {
    if (context.biasScore >= 60) {
      if (mode === "buyers") flags.add("orderflow_bias_alignment");
      if (mode === "sellers") flags.add("orderflow_bias_conflict");
    } else if (context.biasScore <= 40) {
      if (mode === "sellers") flags.add("orderflow_bias_alignment");
      if (mode === "buyers") flags.add("orderflow_bias_conflict");
    }
  }

  if (relVolume >= config.volumeSurgeThreshold) {
    flags.add("volume_surge");
  } else if (relVolume <= config.volumeDryThreshold) {
    flags.add("volume_dry");
  }

  if (rangeRatio >= config.expansionThreshold) {
    flags.add("expansion");
  }

  if (isChoppy) {
    flags.add("choppy");
  }

  if (latestClv >= config.strongClvThreshold) {
    pushReason("price_action", "Strong up-day closing near highs");
  } else if (latestClv <= -config.strongClvThreshold) {
    pushReason("price_action", "Strong down-day closing near lows");
  }

  if (relVolume >= config.volumeSurgeThreshold) {
    pushReason("volume", "Volume above recent average");
  } else if (relVolume <= config.volumeDryThreshold) {
    pushReason("volume", "Volume lighter than average");
  }

  if (rangeRatio >= config.expansionThreshold) {
    pushReason("structure", "Range expansion day");
  }

  if (isChoppy) {
    pushReason("structure", "Series of mixed daily flows");
  }

  if (flags.has("orderflow_trend_alignment")) {
    pushReason("trend_alignment", "Daily flow aligns with prevailing trend");
  } else if (flags.has("orderflow_trend_conflict")) {
    pushReason("trend_conflict", "Daily flow diverges from prevailing trend");
  }

  if (!reasonDetails.length) {
    pushReason("structure", "Daily flow neutral");
  }

  return {
    flowScore,
    mode,
    clv: Number((latestClv * 100).toFixed(1)),
    relVolume: Number(relVolume.toFixed(2)),
    expansion: Number((rangeNormalized * 100).toFixed(1)),
    consistency: Number(consistencyScore.toFixed(1)),
    reasons,
    reasonDetails,
    flags: flags.size ? Array.from(flags) : undefined,
    meta: {
      profile: config.id,
      timeframeSamples,
      context,
    },
  };
}

function resolveOrderflowProfile(assetClass?: string | null): OrderflowProfileId {
  const mapping: Record<string, OrderflowProfileId> = {
    crypto: "crypto",
    index: "index",
    fx: "fx",
    commodity: "commodity",
  };
  return mapping[assetClass ?? ""] ?? "default";
}

function computeAverageRange(series: NormalizedCandle[], length: number): number {
  if (!series.length) return 0;
  const size = Math.min(series.length, length);
  if (size === 0) return 0;
  const ranges = series.slice(0, size).map((item) => item.high - item.low);
  const sum = ranges.reduce((acc, value) => acc + value, 0);
  return sum / size;
}

function detectChoppyFlow(series: number[], window: number, tolerance: number): boolean {
  if (series.length < window) return false;
  const subset = series.slice(0, window);
  const positives = subset.filter((value) => value >= 0.05).length;
  const negatives = subset.filter((value) => value <= -0.05).length;
  const total = positives + negatives;
  if (total === 0) return false;
  const balance = Math.abs(positives - negatives) / total;
  return balance <= tolerance;
}

function computeDailyTrendScore(series: number[], lookback = 30): number {
  if (series.length < 2) {
    return 50;
  }
  const pastIndex = Math.min(series.length - 1, lookback);
  const latest = series[0];
  const past = series[pastIndex];
  if (!past) {
    return 50;
  }
  const pct = past === 0 ? 0 : ((latest - past) / past) * 100;
  return clamp(50 + pct, 0, 100);
}
