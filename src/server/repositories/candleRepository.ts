import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { candles } from "../db/schema/candles";
import { db as drizzleDb } from "../db/db";
import { excluded } from "../db/sqlHelpers";

export type Candle = typeof candles["$inferSelect"];
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

export async function getLatestCandleForAsset(params: {
  assetId: string;
  timeframe: string;
}): Promise<Candle | null> {
  const [candle] = await drizzleDb
    .select()
    .from(candles)
    .where(
      and(
        eq(candles.assetId, params.assetId),
        eq(candles.timeframe, params.timeframe)
      )
    )
    .orderBy(desc(candles.timestamp))
    .limit(1);
  return candle ?? null;
}

export async function getRecentCandlesForAsset(params: {
  assetId: string;
  timeframe: string;
  limit: number;
}): Promise<Candle[]> {
  return drizzleDb
    .select()
    .from(candles)
    .where(
      and(
        eq(candles.assetId, params.assetId),
        eq(candles.timeframe, params.timeframe),
      )
    )
    .orderBy(desc(candles.timestamp))
    .limit(params.limit);
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

type ProviderCandleStat = {
  source: string;
  timeframe: string;
  lastTimestamp: Date | null;
  sampleCount: number;
};

export async function getProviderCandleStats(params?: {
  sources?: string[];
  timeframes?: string[];
}): Promise<ProviderCandleStat[]> {
  const conditions = [];
  if (params?.sources?.length) {
    conditions.push(inArray(candles.source, params.sources));
  }
  if (params?.timeframes?.length) {
    conditions.push(inArray(candles.timeframe, params.timeframes));
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const baseQuery = drizzleDb
    .select({
      source: candles.source,
      timeframe: candles.timeframe,
      lastTimestamp: sql<Date>`max(${candles.timestamp})`,
      sampleCount: sql<number>`count(*)`,
    })
    .from(candles);

  const rows = await (whereClause ? baseQuery.where(whereClause) : baseQuery).groupBy(
    candles.source,
    candles.timeframe,
  );

  return rows.map((row) => ({
    source: row.source,
    timeframe: row.timeframe,
    lastTimestamp: row.lastTimestamp ? new Date(row.lastTimestamp) : null,
    sampleCount: Number(row.sampleCount ?? 0),
  }));
}

type AssetCandleStat = {
  assetId: string;
  source: string;
  timeframe: string;
  lastTimestamp: Date | null;
};

export async function getAssetCandleStats(params?: {
  sources?: string[];
  timeframes?: string[];
  assetIds?: string[];
}): Promise<AssetCandleStat[]> {
  const conditions = [];
  if (params?.sources?.length) {
    conditions.push(inArray(candles.source, params.sources));
  }
  if (params?.timeframes?.length) {
    conditions.push(inArray(candles.timeframe, params.timeframes));
  }
  if (params?.assetIds?.length) {
    conditions.push(inArray(candles.assetId, params.assetIds));
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const baseQuery = drizzleDb
    .select({
      assetId: candles.assetId,
      source: candles.source,
      timeframe: candles.timeframe,
      lastTimestamp: sql<Date>`max(${candles.timestamp})`,
    })
    .from(candles);

  const rows = await (whereClause ? baseQuery.where(whereClause) : baseQuery).groupBy(
    candles.assetId,
    candles.source,
    candles.timeframe,
  );

  return rows.map((row) => ({
    assetId: row.assetId,
    source: row.source,
    timeframe: row.timeframe,
    lastTimestamp: row.lastTimestamp ? new Date(row.lastTimestamp) : null,
  }));
}
