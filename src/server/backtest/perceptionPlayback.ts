import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/src/server/db/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { perceptionSnapshotItems } from "@/src/server/db/schema/perceptionSnapshotItems";
import type { SetupLike } from "./runBacktest";
import { candles } from "@/src/server/db/schema/candles";

export async function getLatestPerceptionSnapshotIdAtOrBefore(params: {
  assetId: string;
  asOf: Date;
}): Promise<{ id: string; snapshotTime: Date } | null> {
  const [row] = await db
    .select({ id: perceptionSnapshots.id, snapshotTime: perceptionSnapshots.snapshotTime })
    .from(perceptionSnapshots)
    .where(lte(perceptionSnapshots.snapshotTime, params.asOf))
    .orderBy(desc(perceptionSnapshots.snapshotTime))
    .limit(1);
  return row ?? null;
}

export async function listPerceptionSnapshotItemsForAsset(params: {
  snapshotId: string;
  assetId: string;
}) {
  return db
    .select()
    .from(perceptionSnapshotItems)
    .where(and(eq(perceptionSnapshotItems.snapshotId, params.snapshotId), eq(perceptionSnapshotItems.assetId, params.assetId)))
    .orderBy(perceptionSnapshotItems.rankOverall, perceptionSnapshotItems.createdAt, perceptionSnapshotItems.id);
}

export function mapItemsToSetups(items: Array<typeof perceptionSnapshotItems.$inferSelect>): SetupLike[] {
  return items.map((item) => ({
    id: item.setupId ?? item.id,
    direction: item.direction ?? null,
    scoreTotal: typeof item.scoreTotal === "number" ? item.scoreTotal : null,
    confidence: typeof item.confidence === "number" ? item.confidence : undefined,
    rankOverall: item.rankOverall,
    rankWithinAsset: item.rankWithinAsset,
    balanceScore: typeof item.scoreTotal === "number" ? item.scoreTotal : undefined,
  }));
}

export async function getCandleOpenAt(params: {
  assetId: string;
  timeframe: string;
  timestamp: Date;
}): Promise<number | null> {
  const timeframe = params.timeframe.toUpperCase();
  const [row] = await db
    .select({ open: candles.open })
    .from(candles)
    .where(and(eq(candles.assetId, params.assetId), eq(candles.timeframe, timeframe), eq(candles.timestamp, params.timestamp)))
    .limit(1);
  return row?.open != null ? Number(row.open) : null;
}
