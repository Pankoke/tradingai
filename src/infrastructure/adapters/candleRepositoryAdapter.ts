import type { CandleRepositoryPort } from "@/src/domain/market-data/ports";
import type { CandleInsert, CandleRow, CandleTimeframe } from "@/src/domain/market-data/types";
import { getCandlesForAsset, getRecentCandlesForAsset, upsertCandles } from "@/src/server/repositories/candleRepository";

export class CandleRepositoryAdapter implements CandleRepositoryPort {
  async upsertMany(candles: CandleInsert[]): Promise<{ inserted: number; updated: number }> {
    if (!candles.length) {
      return { inserted: 0, updated: 0 };
    }

    await upsertCandles(candles);

    return { inserted: candles.length, updated: 0 };
  }

  async findLatestByAsset(assetId: string, timeframe: CandleTimeframe, limit: number): Promise<CandleRow[]> {
    return getRecentCandlesForAsset({
      assetId,
      timeframe,
      limit,
    });
  }

  async findRangeByAsset(assetId: string, timeframe: CandleTimeframe, from: Date, to: Date): Promise<CandleRow[]> {
    return getCandlesForAsset({
      assetId,
      timeframe,
      from,
      to,
    });
  }
}
