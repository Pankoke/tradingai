import { db } from "../db/db";
import { biasSnapshots } from "../db/schema/biasSnapshots";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { excluded } from "../db/sqlHelpers";

export type BiasSnapshot = typeof biasSnapshots["$inferSelect"];
type BiasSnapshotInput = typeof biasSnapshots["$inferInsert"];

const isBiasDebug = process.env.DEBUG_BIAS === "1";
const isServer = typeof window === "undefined";
const logBiasDebug = (...args: unknown[]) => {
  if (isBiasDebug && isServer) {
    console.log(...args);
  }
};

export async function getBiasSnapshot(params: {
  assetId: string;
  date: Date;
  timeframe: string;
}): Promise<BiasSnapshot | undefined> {
  const targetDate = params.date.toISOString().slice(0, 10);
  const [snapshot] = await db
    .select()
    .from(biasSnapshots)
    .where(
      and(
        eq(biasSnapshots.assetId, params.assetId),
        eq(biasSnapshots.date, targetDate),
        eq(
          sql`lower(${biasSnapshots.timeframe})`,
          params.timeframe.toLowerCase(),
        ),
      ),
    )
    .limit(1);

  logBiasDebug("[BiasRepo:getBiasSnapshot]", {
    assetId: params.assetId,
    timeframe: params.timeframe,
    targetDate,
    snapshot: snapshot
      ? {
          assetId: snapshot.assetId,
          timeframe: snapshot.timeframe,
          date: snapshot.date,
          biasScore: snapshot.biasScore,
          confidence: snapshot.confidence,
        }
      : null,
  });
  return snapshot;
}

export async function getBiasSnapshotsForRange(params: {
  assetId: string;
  from: Date;
  to: Date;
  timeframe: string;
}): Promise<BiasSnapshot[]> {
  const fromDate = params.from.toISOString().slice(0, 10);
  const toDate = params.to.toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(biasSnapshots)
    .where(
      and(
        eq(biasSnapshots.assetId, params.assetId),
        eq(
          sql`lower(${biasSnapshots.timeframe})`,
          params.timeframe.toLowerCase(),
        ),
        gte(biasSnapshots.date, fromDate),
        lte(biasSnapshots.date, toDate),
      ),
    )
    .orderBy(sql`${biasSnapshots.date} desc`);

  logBiasDebug("[BiasRepo:getBiasSnapshotsForRange]", {
    assetId: params.assetId,
    timeframe: params.timeframe,
    fromDate,
    toDate,
    rows: rows.map((row) => ({
      date: row.date,
      biasScore: row.biasScore,
      confidence: row.confidence,
    })),
  });
  return rows;
}

export async function upsertBiasSnapshot(input: BiasSnapshotInput): Promise<void> {
  await db
    .insert(biasSnapshots)
    .values(input)
    .onConflictDoUpdate({
      target: biasSnapshots.id,
      set: {
        assetId: excluded(biasSnapshots.assetId.name),
        date: excluded(biasSnapshots.date.name),
        timeframe: excluded(biasSnapshots.timeframe.name),
        biasScore: excluded(biasSnapshots.biasScore.name),
        confidence: excluded(biasSnapshots.confidence.name),
        trendScore: excluded(biasSnapshots.trendScore.name),
        volatilityScore: excluded(biasSnapshots.volatilityScore.name),
        rangeScore: excluded(biasSnapshots.rangeScore.name),
        meta: excluded(biasSnapshots.meta.name)
      }
    });
}
