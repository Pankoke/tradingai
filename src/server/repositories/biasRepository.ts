import { db } from "../db/db";
import { biasSnapshots } from "../db/schema/biasSnapshots";
import { eq, excluded } from "drizzle-orm";

type BiasSnapshot = typeof biasSnapshots["$inferSelect"];
type BiasSnapshotInput = typeof biasSnapshots["$inferInsert"];

export async function getBiasSnapshot(params: {
  assetId: string;
  date: Date;
  timeframe: string;
}): Promise<BiasSnapshot | undefined> {
  const [snapshot] = await db
    .select()
    .from(biasSnapshots)
    .where(
      eq(biasSnapshots.assetId, params.assetId),
      eq(biasSnapshots.date, params.date),
      eq(biasSnapshots.timeframe, params.timeframe)
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
        assetId: excluded(biasSnapshots.assetId),
        date: excluded(biasSnapshots.date),
        timeframe: excluded(biasSnapshots.timeframe),
        biasScore: excluded(biasSnapshots.biasScore),
        confidence: excluded(biasSnapshots.confidence),
        trendScore: excluded(biasSnapshots.trendScore),
        volatilityScore: excluded(biasSnapshots.volatilityScore),
        rangeScore: excluded(biasSnapshots.rangeScore),
        meta: excluded(biasSnapshots.meta)
      }
    });
}
