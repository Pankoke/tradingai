import { getRecentCandlesForAsset, type Candle } from "@/src/server/repositories/candleRepository";
import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";

export type OrderflowMode = "buyers" | "sellers" | "balanced";

export interface OrderflowMetrics {
  flowScore: number;
  mode: OrderflowMode;
  clv: number; // Close location value (-100..100)
  relVolume: number; // multiple of average volume
  expansion: number; // 0..100 normalized expansion score
  consistency: number; // 0..100 dominance of one flow direction
  reasons: string[];
  meta?: {
    timeframeSamples: Record<MarketTimeframe, number>;
  };
}

export const ORDERFLOW_TIMEFRAMES: MarketTimeframe[] = ["4H", "1H", "15m"];
const DEFAULT_LIMITS: Record<MarketTimeframe, number> = {
  "4H": 90,
  "1H": 96,
  "15m": 120,
  "1D": 120,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const clampPercent = (value: number | undefined | null): number => {
  if (typeof value !== "number" || Number.isNaN(value)) return 50;
  return clamp(Math.round(value), 0, 100);
};

interface NormalizedCandle {
  timestamp: Date;
  close: number;
  high: number;
  low: number;
  volume: number;
}

function normalizeCandles(candles: Candle[]): NormalizedCandle[] {
  return candles
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
  asset: Asset;
  timeframes?: MarketTimeframe[];
}): Promise<OrderflowMetrics> {
  const requestedTfs = params.timeframes ?? ORDERFLOW_TIMEFRAMES;
  const uniqueTfs = Array.from(new Set(requestedTfs)).filter((tf) => ORDERFLOW_TIMEFRAMES.includes(tf));
  const timeframeSamples: Record<MarketTimeframe, number> = {
    "1D": 0,
    "4H": 0,
    "1H": 0,
    "15m": 0,
  };

  const candleMap = new Map<MarketTimeframe, NormalizedCandle[]>();

  await Promise.all(
    uniqueTfs.map(async (timeframe) => {
      const raw = await getRecentCandlesForAsset({
        assetId: params.asset.id,
        timeframe,
        limit: DEFAULT_LIMITS[timeframe] ?? 60,
      });
      const normalized = normalizeCandles(raw);
      candleMap.set(timeframe, normalized);
      timeframeSamples[timeframe] = normalized.length;
    }),
  );

  const fifteen = candleMap.get("15m") ?? [];
  const oneHour = candleMap.get("1H") ?? [];
  const fourHour = candleMap.get("4H") ?? [];

  if (!fifteen.length && !oneHour.length && !fourHour.length) {
    return {
      flowScore: 50,
      mode: "balanced",
      clv: 0,
      relVolume: 1,
      expansion: 0,
      consistency: 50,
      reasons: ["Insufficient intraday data for orderflow"],
      meta: { timeframeSamples },
    };
  }

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
  if (Math.abs(clvAvg) >= 0.1) {
    reasons.push(
      `CLV skewed ${clvAvg > 0 ? "bullish" : "bearish"} (${(clvAvg * 100).toFixed(1)}%)`,
    );
  }
  if (relVolume >= 1.1) {
    reasons.push(`Volume ${relVolume.toFixed(2)}x average`);
  } else if (relVolume <= 0.9) {
    reasons.push(`Volume light (${relVolume.toFixed(2)}x avg)`);
  }
  if (expansionRatio >= 0.15) {
    reasons.push("Range expansion active");
  } else if (expansionRatio <= -0.15) {
    reasons.push("Range contraction");
  }
  if (consistency >= 0.7) {
    reasons.push("Flow consistent across intraday candles");
  } else if (consistency <= 0.3) {
    reasons.push("Flow choppy / mixed");
  }
  if (!reasons.length) {
    reasons.push("Orderflow neutral");
  }

  return {
    flowScore,
    mode,
    clv: Number((clvAvg * 100).toFixed(1)),
    relVolume: Number(relVolume.toFixed(2)),
    expansion: Number((expansionNormalized * 100).toFixed(1)),
    consistency: Number((consistency * 100).toFixed(1)),
    reasons,
    meta: { timeframeSamples },
  };
}
