import type { CandleTimeframe } from "@/src/domain/market-data/types";

export type MarketMetrics = {
  trendScore: number;
  momentumScore: number;
  volatilityScore: number;
  priceDriftPct: number;
  lastPrice: number | null;
  isStale: boolean;
  reasons: string[];
  evaluatedAt: string;
};

export type MarketTimeframe = CandleTimeframe;

export type CandleLike = {
  timestamp: Date;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume?: number | string | null;
};

type NormalizedCandle = {
  timestamp: Date;
  close: number;
  high: number;
  low: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeCandles(candles: CandleLike[]): NormalizedCandle[] {
  return candles
    .map((candle) => ({
      timestamp: candle.timestamp,
      close: Number(candle.close),
      high: Number(candle.high),
      low: Number(candle.low),
    }))
    .filter((item) => Number.isFinite(item.close));
}

function computePercentChange(values: number[]): number {
  if (values.length < 2) return 0;
  const latest = values[0];
  const past = values[Math.min(values.length - 1, 30)];
  if (past === 0) return 0;
  return ((latest - past) / past) * 100;
}

function computeTrendScore(series: number[]): number {
  const change = computePercentChange(series);
  return clamp(50 + change, 0, 100);
}

function computeMomentumScore(series: number[]): number {
  const change = computePercentChange(series.slice(0, 15));
  return clamp(50 + change * 2, 0, 100);
}

function computeVolatilityScore(values: number[]): number {
  if (values.length < 10) return 50;
  const returns: number[] = [];
  for (let i = 0; i < values.length - 1; i += 1) {
    const prev = values[i + 1];
    if (prev === 0) continue;
    returns.push((values[i] - prev) / prev);
  }
  if (!returns.length) return 40;
  const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const variance = returns.reduce((sum, val) => sum + (val - mean) ** 2, 0) / returns.length;
  const stddev = Math.sqrt(variance);
  return clamp(stddev * 1000, 10, 100);
}

function isFresh(timestamp: Date, toleranceMs: number, now: Date): boolean {
  return now.getTime() - timestamp.getTime() <= toleranceMs;
}

export async function buildMarketMetrics(params: {
  candlesByTimeframe: Partial<Record<MarketTimeframe, CandleLike[]>>;
  referencePrice: number;
  timeframes: MarketTimeframe[];
  now: Date;
  profile?: "SWING" | "INTRADAY" | "POSITION";
}): Promise<MarketMetrics> {
  const candlesByTimeframe = new Map<MarketTimeframe, NormalizedCandle[]>();

  for (const timeframe of params.timeframes) {
    const raw = params.candlesByTimeframe[timeframe] ?? [];
    candlesByTimeframe.set(timeframe, normalizeCandles(raw));
  }

  const profile = params.profile ?? "INTRADAY";
  const useSwingCore = profile === "SWING";
  const dailyCandles = candlesByTimeframe.get("1D") ?? [];
  const weeklyCandles = candlesByTimeframe.get("1W") ?? [];
  const fourHour = useSwingCore ? [] : candlesByTimeframe.get("4H") ?? [];
  const oneHour = useSwingCore ? [] : candlesByTimeframe.get("1H") ?? [];
  const fifteenMin = useSwingCore ? [] : candlesByTimeframe.get("15m") ?? [];

  const trendSeries: number[] = [];
  const volatilitySeries: number[] = [];
  if (dailyCandles.length) {
    trendSeries.push(...dailyCandles.map((c) => c.close));
    volatilitySeries.push(...dailyCandles.map((c) => c.close));
  }
  if (weeklyCandles.length) {
    trendSeries.push(...weeklyCandles.map((c) => c.close));
    volatilitySeries.push(...weeklyCandles.map((c) => c.close));
  }

  const aggregatedTrendScore = (() => {
    const scores: number[] = [];
    if (trendSeries.length) scores.push(computeTrendScore(trendSeries));
    if (fourHour.length) scores.push(computeTrendScore(fourHour.map((c) => c.close)));
    if (oneHour.length) scores.push(computeTrendScore(oneHour.map((c) => c.close)));
    if (!scores.length) return 50;
    return scores.reduce((sum, val) => sum + val, 0) / scores.length;
  })();

  const aggregatedMomentumScore = (() => {
    const scores: number[] = [];
    if (useSwingCore) {
      if (dailyCandles.length) {
        scores.push(computeMomentumScore(dailyCandles.map((c) => c.close)));
      }
    } else {
      if (oneHour.length) scores.push(computeMomentumScore(oneHour.map((c) => c.close)));
      if (fifteenMin.length) scores.push(computeMomentumScore(fifteenMin.map((c) => c.close)));
    }
    if (!scores.length) return 50;
    return scores.reduce((sum, val) => sum + val, 0) / scores.length;
  })();

  const volatilityScore = volatilitySeries.length ? computeVolatilityScore(volatilitySeries) : 50;

  const latestPriceSource = useSwingCore
    ? dailyCandles[0] ?? weeklyCandles[0]
    : fifteenMin[0] ?? oneHour[0] ?? fourHour[0] ?? dailyCandles[0];
  const lastPrice = latestPriceSource?.close ?? null;
  const priceDriftPct =
    params.referencePrice > 0 && lastPrice
      ? ((lastPrice - params.referencePrice) / params.referencePrice) * 100
      : 0;

  const reasons: string[] = [];
  const driftTolerancePct = profile === "SWING" ? 8 : 5;
  const hasTrendData = dailyCandles.length || weeklyCandles.length || fourHour.length || oneHour.length;
  if (!hasTrendData) {
    reasons.push("No market data for trend");
  }
  if (dailyCandles.length && !isFresh(dailyCandles[0].timestamp, 2 * 24 * 60 * 60 * 1000, params.now)) {
    reasons.push("Daily candle outdated");
  }
  if (!useSwingCore && oneHour.length && !isFresh(oneHour[0].timestamp, 90 * 60 * 1000, params.now)) {
    reasons.push("1H candle outdated");
  }
  if (Math.abs(priceDriftPct) > driftTolerancePct && lastPrice) {
    reasons.push(`Price drift ${priceDriftPct.toFixed(1)}% from reference`);
  }

  return {
    trendScore: clamp(aggregatedTrendScore, 0, 100),
    momentumScore: clamp(aggregatedMomentumScore, 0, 100),
    volatilityScore: clamp(volatilityScore, 0, 100),
    priceDriftPct,
    lastPrice,
    isStale: reasons.length > 0,
    reasons,
    evaluatedAt: params.now.toISOString(),
  };
}
