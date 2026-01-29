import type { CandleInsert, CandleRow, CandleTimeframe, NormalizedCandle } from "./types";
import type { WriteResult } from "@/src/domain/shared/writeResult";

export interface CandleRepositoryPort {
  upsertMany(candles: CandleInsert[]): Promise<WriteResult>;
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
