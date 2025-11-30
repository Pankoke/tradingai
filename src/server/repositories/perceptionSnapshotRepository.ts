import { db } from "../db/db";
import { desc, eq } from "drizzle-orm";
import { perceptionSnapshotItems } from "../db/schema/perceptionSnapshotItems";
import { perceptionSnapshots } from "../db/schema/perceptionSnapshots";
import { excluded } from "../db/sqlHelpers";

type PerceptionSnapshot = typeof perceptionSnapshots["$inferSelect"];
export type PerceptionSnapshotInput = typeof perceptionSnapshots["$inferInsert"];
type PerceptionSnapshotItem = typeof perceptionSnapshotItems["$inferSelect"];
export type PerceptionSnapshotItemInput = typeof perceptionSnapshotItems["$inferInsert"];

export type PerceptionSnapshotWithItems = {
  snapshot: PerceptionSnapshot;
  items: PerceptionSnapshotItem[];
};

async function loadSnapshotItems(snapshotId: string) {
  return db
    .select()
    .from(perceptionSnapshotItems)
    .where(eq(perceptionSnapshotItems.snapshotId, snapshotId))
    .orderBy(desc(perceptionSnapshotItems.rankOverall));
}

export async function getLatestSnapshot(): Promise<PerceptionSnapshotWithItems | undefined> {
  const [snapshot] = await db
    .select()
    .from(perceptionSnapshots)
    .orderBy(desc(perceptionSnapshots.snapshotTime))
    .limit(1);

  if (!snapshot) {
    return undefined;
  }

  const items = await loadSnapshotItems(snapshot.id);
  return { snapshot, items };
}

export async function getSnapshotByTime(params: {
  snapshotTime: Date;
}): Promise<PerceptionSnapshotWithItems | undefined> {
  const [snapshot] = await db
    .select()
    .from(perceptionSnapshots)
    .where(eq(perceptionSnapshots.snapshotTime, params.snapshotTime))
    .limit(1);

  if (!snapshot) {
    return undefined;
  }

  const items = await loadSnapshotItems(snapshot.id);
  return { snapshot, items };
}

export async function insertSnapshotWithItems(params: {
  snapshot: PerceptionSnapshotInput;
  items: PerceptionSnapshotItemInput[];
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(perceptionSnapshots)
      .values(params.snapshot)
      .onConflictDoUpdate({
        target: perceptionSnapshots.id,
        set: {
          snapshotTime: excluded(perceptionSnapshots.snapshotTime.name),
          label: excluded(perceptionSnapshots.label.name),
          version: excluded(perceptionSnapshots.version.name),
          dataMode: excluded(perceptionSnapshots.dataMode.name),
          generatedMs: excluded(perceptionSnapshots.generatedMs.name),
          notes: excluded(perceptionSnapshots.notes.name)
        }
      });

    await tx
      .delete(perceptionSnapshotItems)
      .where(eq(perceptionSnapshotItems.snapshotId, params.snapshot.id));

    if (!params.items.length) {
      return;
    }

    await tx.insert(perceptionSnapshotItems).values(params.items);
  });
}
