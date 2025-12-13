import { db } from "../db/db";
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { perceptionSnapshotItems } from "../db/schema/perceptionSnapshotItems";
import { perceptionSnapshots } from "../db/schema/perceptionSnapshots";
import { excluded } from "../db/sqlHelpers";
import type { Setup } from "@/src/lib/engine/types";

type PerceptionSnapshot = typeof perceptionSnapshots["$inferSelect"];
export type PerceptionSnapshotInput = typeof perceptionSnapshots["$inferInsert"];
type PerceptionSnapshotItem = typeof perceptionSnapshotItems["$inferSelect"];
export type PerceptionSnapshotItemInput = typeof perceptionSnapshotItems["$inferInsert"];

export type PerceptionSnapshotWithItems = {
  snapshot: PerceptionSnapshot;
  items: PerceptionSnapshotItem[];
  setups: Setup[];
};

type SnapshotFilters = {
  label?: string;
  dataMode?: string;
  from?: Date;
  to?: Date;
};

async function loadSnapshotItems(snapshotId: string) {
  return db
    .select()
    .from(perceptionSnapshotItems)
    .where(eq(perceptionSnapshotItems.snapshotId, snapshotId))
    .orderBy(desc(perceptionSnapshotItems.rankOverall));
}

function buildSnapshotWhere(filters?: SnapshotFilters): SQL<unknown> | undefined {
  if (!filters) return undefined;
  const conditions: SQL<unknown>[] = [];
  if (filters.label) {
    conditions.push(eq(perceptionSnapshots.label, filters.label));
  }
  if (filters.dataMode) {
    conditions.push(eq(perceptionSnapshots.dataMode, filters.dataMode));
  }
  if (filters.from) {
    conditions.push(gte(perceptionSnapshots.snapshotTime, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(perceptionSnapshots.snapshotTime, filters.to));
  }
  return conditions.length ? and(...conditions) : undefined;
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
  const setups = (snapshot.setups ?? []) as Setup[];
  return { snapshot, items, setups };
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
  const setups = (snapshot.setups ?? []) as Setup[];
  return { snapshot, items, setups };
}

export async function insertSnapshotWithItems(params: {
  snapshot: PerceptionSnapshotInput;
  items: PerceptionSnapshotItemInput[];
}): Promise<void> {
  // Ensure new JSONB columns exist in legacy DBs before inserting
  await db.execute(sql`ALTER TABLE perception_snapshot_items ADD COLUMN IF NOT EXISTS ring_ai_summary JSONB;`);

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
          notes: excluded(perceptionSnapshots.notes.name),
          setups: excluded(perceptionSnapshots.setups.name)
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

export async function listRecentSnapshots(limit = 5): Promise<PerceptionSnapshot[]> {
  return db
    .select()
    .from(perceptionSnapshots)
    .orderBy(desc(perceptionSnapshots.snapshotTime))
    .limit(limit);
}

export async function listSnapshotsPaged(params: {
  filters?: SnapshotFilters;
  page?: number;
  pageSize?: number;
}): Promise<{ snapshots: PerceptionSnapshot[]; total: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const whereClause = buildSnapshotWhere(params.filters);

  const snapshotQuery = whereClause
    ? db.select().from(perceptionSnapshots).where(whereClause)
    : db.select().from(perceptionSnapshots);
  const snapshots = await snapshotQuery
    .orderBy(desc(perceptionSnapshots.snapshotTime))
    .limit(pageSize)
    .offset(offset);

  const countQuery = whereClause
    ? db.select({ value: sql<number>`count(*)` }).from(perceptionSnapshots).where(whereClause)
    : db.select({ value: sql<number>`count(*)` }).from(perceptionSnapshots);
  const [countResult] = await countQuery;

  return { snapshots, total: countResult?.value ?? 0 };
}

export async function getSnapshotById(id: string): Promise<PerceptionSnapshot | undefined> {
  const [snapshot] = await db
    .select()
    .from(perceptionSnapshots)
    .where(eq(perceptionSnapshots.id, id))
    .limit(1);
  return snapshot;
}

export async function getSnapshotWithItems(snapshotId: string): Promise<PerceptionSnapshotWithItems | undefined> {
  const snapshot = await getSnapshotById(snapshotId);
  if (!snapshot) return undefined;
  const items = await loadSnapshotItems(snapshotId);
  const setups = (snapshot.setups ?? []) as Setup[];
  return { snapshot, items, setups };
}

export async function listSnapshotItems(snapshotId: string): Promise<PerceptionSnapshotItem[]> {
  return loadSnapshotItems(snapshotId);
}
