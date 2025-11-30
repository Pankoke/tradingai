import { and, desc, eq, gte, lte } from "drizzle-orm";
import { candles } from "../db/schema/candles";
import { db as drizzleDb } from "../db/db";
import { excluded } from "../db/sqlHelpers";

type Candle = typeof candles["$inferSelect"];
type CandleInsert = typeof candles["$inferInsert"];

export type CandleInput = Omit<CandleInsert, "id">;

export async function getCandlesForAsset(params: {
  assetId: string;
  timeframe: string;
  from: Date;
  to: Date;
}): Promise<Candle[]> {
  if (params.from > params.to) {
    throw new Error("`from` must be before `to`");
  }

  return drizzleDb
    .select()
    .from(candles)
    .where(
      and(
        eq(candles.assetId, params.assetId),
        eq(candles.timeframe, params.timeframe),
        gte(candles.timestamp, params.from),
        lte(candles.timestamp, params.to)
      )
    )
    .orderBy(desc(candles.timestamp));
}

export async function upsertCandles(candleInputs: CandleInput[]): Promise<void> {
  if (!candleInputs.length) {
    return;
  }

  const rows: CandleInsert[] = candleInputs.map((input) => {
    const id = `${input.assetId}-${input.timeframe}-${input.timestamp.getTime()}`;
    return {
      id,
      assetId: input.assetId,
      timeframe: input.timeframe,
      timestamp: input.timestamp,
      open: input.open,
      high: input.high,
      low: input.low,
      close: input.close,
      volume: input.volume,
      source: input.source,
      createdAt: input.createdAt
    } as CandleInsert;
  });

  await drizzleDb
    .insert(candles)
    .values(rows)
      .onConflictDoUpdate({
        target: candles.id,
        set: {
          open: excluded(candles.open.name),
          high: excluded(candles.high.name),
          low: excluded(candles.low.name),
          close: excluded(candles.close.name),
          volume: excluded(candles.volume.name),
          source: excluded(candles.source.name)
        }
      });
}
