import type { CandleInsert, CandleRow, CandleTimeframe, NormalizedCandle } from "./types";

export interface CandleRepositoryPort {
  upsertMany(candles: CandleInsert[]): Promise<{ inserted: number; updated: number }>;
  findLatestByAsset(assetId: string, timeframe: CandleTimeframe, limit: number): Promise<CandleRow[]>;
  findRangeByAsset(assetId: string, timeframe: CandleTimeframe, from: Date, to: Date): Promise<CandleRow[]>;
}

export interface MarketDataProviderPort {
  fetchCandles(params: {
    symbol: string;
    timeframe: CandleTimeframe;
    from: Date;
    to: Date;
  }): Promise<NormalizedCandle[]>;
}
