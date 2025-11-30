import { db } from "../db/db";
import { biasSnapshots } from "../db/schema/biasSnapshots";
import { and, eq } from "drizzle-orm";
import { excluded } from "../db/sqlHelpers";

type BiasSnapshot = typeof biasSnapshots["$inferSelect"];
type BiasSnapshotInput = typeof biasSnapshots["$inferInsert"];

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
        eq(biasSnapshots.timeframe, params.timeframe),
      ),
    )
    .limit(1);
  return snapshot;
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
