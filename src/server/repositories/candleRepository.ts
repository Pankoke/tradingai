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
  const timeframe = params.timeframe.toUpperCase();

  const rows = await drizzleDb
    .select()
    .from(candles)
    .where(
      and(
        eq(candles.assetId, params.assetId),
        eq(candles.timeframe, timeframe),
        gte(candles.timestamp, params.from),
        lte(candles.timestamp, params.to)
      )
    )
    .orderBy(desc(candles.timestamp));

  if (timeframe === "1D") {
    const seen = new Set<string>();
    const deduped: Candle[] = [];
    for (const row of rows) {
      const k = `${row.timestamp.getUTCFullYear()}-${(row.timestamp.getUTCMonth() + 1)
        .toString()
        .padStart(2, "0")}-${row.timestamp.getUTCDate().toString().padStart(2, "0")}`;
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(row);
    }
    return deduped;
  }

  return rows;
}

export async function getLatestCandleForAsset(params: {
  assetId: string;
  timeframe: string;
}): Promise<Candle | null> {
  const timeframe = params.timeframe.toUpperCase();
  const [candle] = await drizzleDb
    .select()
    .from(candles)
    .where(
      and(
        eq(candles.assetId, params.assetId),
        eq(candles.timeframe, timeframe)
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
  const timeframe = params.timeframe.toUpperCase();
  return drizzleDb
    .select()
    .from(candles)
    .where(
      and(
        eq(candles.assetId, params.assetId),
        eq(candles.timeframe, timeframe),
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
    const timeframe = input.timeframe.toUpperCase();
    const ts = input.timestamp instanceof Date ? input.timestamp : new Date(input.timestamp);
    const canonicalTimestamp =
      timeframe === "1D"
        ? new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate()))
        : ts;
    const id = `${input.assetId}-${timeframe}-${canonicalTimestamp.getTime()}`;
    return {
      id,
      assetId: input.assetId,
      timeframe,
      timestamp: canonicalTimestamp,
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
