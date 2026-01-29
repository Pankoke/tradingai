import type { CandleRepositoryPort } from "@/src/domain/market-data/ports";
import type { CandleTimeframe, CandleInsert, CandleRow } from "@/src/domain/market-data/types";
import { aggregateCandles } from "@/src/domain/market-data/services/aggregateCandles";

const TIMEFRAME_MS: Record<CandleTimeframe, number> = {
  "15m": 15 * 60 * 1000,
  "1H": 60 * 60 * 1000,
  "4H": 4 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
};

export async function deriveCandlesForTimeframe(params: {
  assetId: string;
  sourceTimeframe: CandleTimeframe;
  targetTimeframe: CandleTimeframe;
  lookbackCount: number;
  asOf: Date;
  candleRepo: CandleRepositoryPort;
  sourceLabel?: string;
}): Promise<{ derivedBuckets: number; upserted: number; updated: number }> {
  const { assetId, sourceTimeframe, targetTimeframe, lookbackCount, asOf, candleRepo } = params;
  const sourceMs = TIMEFRAME_MS[sourceTimeframe];
  if (!sourceMs) {
    throw new Error(`Unsupported source timeframe ${sourceTimeframe}`);
  }
  const from = new Date(asOf.getTime() - lookbackCount * sourceMs);
  const sourceCandles: CandleRow[] = await candleRepo.findRangeByAsset(assetId, sourceTimeframe, from, asOf);

  const aggregated = aggregateCandles({
    candles: sourceCandles,
    sourceTimeframe,
    targetTimeframe,
    asOf,
  }).map((candle) => ({
    ...candle,
    source: params.sourceLabel ?? "derived",
  })) as CandleInsert[];

  if (!aggregated.length) {
    return { derivedBuckets: 0, upserted: 0, updated: 0 };
  }

  const result = await candleRepo.upsertMany(aggregated);
  return { derivedBuckets: aggregated.length, upserted: result.inserted, updated: result.updated };
}
