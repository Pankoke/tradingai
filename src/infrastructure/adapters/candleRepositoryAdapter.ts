import type { CandleRepositoryPort } from "@/src/domain/market-data/ports";
import type { CandleInsert, CandleRow, CandleTimeframe } from "@/src/domain/market-data/types";
import { UNKNOWN_COUNTS_NOTE, type WriteResult } from "@/src/domain/shared/writeResult";
import { getCandlesForAsset, getRecentCandlesForAsset, upsertCandles } from "@/src/server/repositories/candleRepository";
import { unknownWriteResult } from "@/src/server/storage/writeResult";

export class CandleRepositoryAdapter implements CandleRepositoryPort {
  async upsertMany(candles: CandleInsert[]): Promise<WriteResult> {
    if (!candles.length) {
      return { inserted: 0, updated: 0, upserted: 0 };
    }

    await upsertCandles(
      candles.map((candle) => ({
        ...candle,
        open: String(candle.open),
        high: String(candle.high),
        low: String(candle.low),
        close: String(candle.close),
        volume: candle.volume != null ? String(candle.volume) : undefined,
      })),
    );

    return unknownWriteResult(UNKNOWN_COUNTS_NOTE);
  }

  async findLatestByAsset(assetId: string, timeframe: CandleTimeframe, limit: number): Promise<CandleRow[]> {
    const rows = await getRecentCandlesForAsset({
      assetId,
      timeframe,
      limit,
    });
    return rows.map((row) => ({
      ...row,
      timeframe: row.timeframe as CandleTimeframe,
      volume: row.volume ?? undefined,
      createdAt: row.createdAt ?? undefined,
    }));
  }

  async findRangeByAsset(assetId: string, timeframe: CandleTimeframe, from: Date, to: Date): Promise<CandleRow[]> {
    const rows = await getCandlesForAsset({
      assetId,
      timeframe,
      from,
      to,
    });
    return rows.map((row) => ({
      ...row,
      timeframe: row.timeframe as CandleTimeframe,
      volume: row.volume ?? undefined,
      createdAt: row.createdAt ?? undefined,
    }));
  }
}
