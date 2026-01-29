import type { CandleRow } from "@/src/domain/market-data/types";

export type CandleLike = Pick<
  CandleRow,
  "timestamp" | "open" | "high" | "low" | "close" | "volume" | "timeframe" | "assetId" | "source"
>;

const MS = {
  "15m": 15 * 60 * 1000,
  "1H": 60 * 60 * 1000,
  "4H": 4 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
} as const;

function floorToBucket(timestamp: Date, timeframe: keyof typeof MS): number {
  const ms = timestamp.getTime();
  const size = MS[timeframe];
  return Math.floor(ms / size) * size;
}

export function aggregateCandles(params: {
  candles: CandleLike[];
  sourceTimeframe: keyof typeof MS;
  targetTimeframe: keyof typeof MS;
  asOf: Date;
}): CandleLike[] {
  const { candles, sourceTimeframe, targetTimeframe, asOf } = params;

  if (sourceTimeframe === targetTimeframe) {
    return candles
      .filter((c) => c.timestamp.getTime() <= asOf.getTime())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  const targetSize = MS[targetTimeframe];
  const sourceSize = MS[sourceTimeframe];
  if (!targetSize || !sourceSize || targetSize <= sourceSize) {
    return [];
  }

  const buckets = new Map<number, CandleLike[]>();
  candles
    .filter((c) => c.timestamp.getTime() <= asOf.getTime())
    .forEach((c) => {
      const bucketStart = floorToBucket(c.timestamp, targetTimeframe);
      const arr = buckets.get(bucketStart) ?? [];
      arr.push(c);
      buckets.set(bucketStart, arr);
    });

  const aggregated: CandleLike[] = Array.from(buckets.entries())
    .map(([bucketStart, list]) => {
      const sortedAsc = list
        .slice()
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const opens = sortedAsc[0];
      const closes = sortedAsc[sortedAsc.length - 1];
      const highs = Math.max(...sortedAsc.map((c) => Number(c.high)));
      const lows = Math.min(...sortedAsc.map((c) => Number(c.low)));
      const volume = sortedAsc.reduce((sum, c) => sum + Number(c.volume ?? 0), 0);

      return {
        assetId: opens.assetId,
        timeframe: targetTimeframe,
        timestamp: new Date(bucketStart),
        open: opens.open,
        high: highs,
        low: lows,
        close: closes.close,
        volume,
        source: opens.source,
      };
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return aggregated;
}
