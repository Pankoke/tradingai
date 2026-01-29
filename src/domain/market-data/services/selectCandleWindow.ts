import type { CandleRow } from "@/src/domain/market-data/types";

export type CandleLike = Pick<
  CandleRow,
  "timestamp" | "open" | "high" | "low" | "close" | "volume" | "timeframe" | "assetId" | "source"
>;

export function selectCandleWindow(params: {
  candles: CandleLike[];
  asOf: Date;
  lookbackCount: number;
}): CandleLike[] {
  const { candles, asOf, lookbackCount } = params;
  if (lookbackCount <= 0) return [];

  return candles
    .filter((candle) => candle.timestamp.getTime() <= asOf.getTime())
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, lookbackCount);
}
