import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, lte, sql, or, ilike } from "drizzle-orm";
import { db } from "@/src/server/db/db";
import { setupOutcomes } from "@/src/server/db/schema/setupOutcomes";
import { excluded } from "@/src/server/db/sqlHelpers";

export type SetupOutcomeRow = typeof setupOutcomes.$inferSelect;
export type SetupOutcomeInsert = typeof setupOutcomes.$inferInsert;

function isMissingTableError(error: unknown): boolean {
  if (typeof error === "object" && error) {
    const err = error as { code?: string; cause?: { code?: string } };
    if (err.code === "42P01") return true;
    if (err.cause?.code === "42P01") return true;
  }
  if (error instanceof Error && error.message.includes("setup_outcomes")) {
    return true;
  }
  return false;
}

export async function upsertOutcome(payload: SetupOutcomeInsert): Promise<void> {
  const compositeId =
    payload.snapshotId && payload.setupId ? `${payload.snapshotId}__${payload.setupId}` : undefined;
  const id = payload.id ?? compositeId ?? randomUUID();
  const row = { ...payload, id };
  try {
    await db
      .insert(setupOutcomes)
      .values(row)
      .onConflictDoUpdate({
        target: [setupOutcomes.snapshotId, setupOutcomes.setupId],
        set: {
          snapshotId: excluded(setupOutcomes.snapshotId.name),
          assetId: excluded(setupOutcomes.assetId.name),
          profile: excluded(setupOutcomes.profile.name),
          timeframe: excluded(setupOutcomes.timeframe.name),
          direction: excluded(setupOutcomes.direction.name),
          playbookId: excluded(setupOutcomes.playbookId.name),
          setupGrade: excluded(setupOutcomes.setupGrade.name),
          setupType: excluded(setupOutcomes.setupType.name),
          gradeRationale: excluded(setupOutcomes.gradeRationale.name),
          noTradeReason: excluded(setupOutcomes.noTradeReason.name),
          gradeDebugReason: excluded(setupOutcomes.gradeDebugReason.name),
          evaluatedAt: excluded(setupOutcomes.evaluatedAt.name),
          windowBars: excluded(setupOutcomes.windowBars.name),
          outcomeStatus: excluded(setupOutcomes.outcomeStatus.name),
          outcomeAt: excluded(setupOutcomes.outcomeAt.name),
          barsToOutcome: excluded(setupOutcomes.barsToOutcome.name),
          reason: excluded(setupOutcomes.reason.name),
        },
      });
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }
}

export async function getOutcomeBySetupId(setupId: string): Promise<SetupOutcomeRow | null> {
  try {
    const [row] = await db.select().from(setupOutcomes).where(eq(setupOutcomes.setupId, setupId)).limit(1);
    return row ?? null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function getOutcomesBySetupIds(setupIds: string[]): Promise<Record<string, SetupOutcomeRow>> {
  if (!setupIds.length) return {};
  try {
    const rows = await db.select().from(setupOutcomes).where(inArray(setupOutcomes.setupId, setupIds));
    return rows.reduce<Record<string, SetupOutcomeRow>>((acc, row) => {
      acc[row.setupId] = row;
      return acc;
    }, {});
  } catch (error) {
    if (isMissingTableError(error)) return {};
    throw error;
  }
}

export async function getOutcomesBySnapshotAndSetupIds(
  pairs: Array<{ snapshotId: string; setupId: string }>,
): Promise<Record<string, SetupOutcomeRow>> {
  if (!pairs.length) return {};
  try {
    const snapshotIds = Array.from(new Set(pairs.map((p) => p.snapshotId)));
    const setupIds = Array.from(new Set(pairs.map((p) => p.setupId)));
    const rows = await db
      .select()
      .from(setupOutcomes)
      .where(and(inArray(setupOutcomes.snapshotId, snapshotIds), inArray(setupOutcomes.setupId, setupIds)));
    return rows.reduce<Record<string, SetupOutcomeRow>>((acc, row) => {
      const key = `${row.snapshotId}|${row.setupId}`;
      acc[key] = row;
      return acc;
    }, {});
  } catch (error) {
    if (isMissingTableError(error)) return {};
    throw error;
  }
}

export async function listRecentOutcomes(params?: {
  limit?: number;
  days?: number;
  assetId?: string;
}): Promise<SetupOutcomeRow[]> {
  const limit = Math.min(200, Math.max(1, params?.limit ?? 50));
  const conditions = [];
  if (params?.assetId) {
    conditions.push(eq(setupOutcomes.assetId, params.assetId));
  }
  if (params?.days && params.days > 0) {
    const from = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);
    conditions.push(gte(setupOutcomes.evaluatedAt, from));
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;
  try {
    const query = whereClause
      ? db.select().from(setupOutcomes).where(whereClause)
      : db.select().from(setupOutcomes);
    return query.orderBy(desc(setupOutcomes.evaluatedAt)).limit(limit);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}

export async function listOutcomesForWindow(params: {
  from?: Date;
  to?: Date;
  profile?: string;
  assetId?: string;
  timeframe?: string;
  limit?: number;
  playbookId?: string;
  mode?: "all" | "latest";
}): Promise<SetupOutcomeRow[]> {
  const conditions = [];
  if (params.from) {
    conditions.push(gte(setupOutcomes.evaluatedAt, params.from));
  }
  if (params.to) {
    conditions.push(lte(setupOutcomes.evaluatedAt, params.to));
  }
  if (params.profile) {
    conditions.push(eq(setupOutcomes.profile, params.profile));
  }
  if (params.assetId) {
    conditions.push(eq(setupOutcomes.assetId, params.assetId));
  }
  if (params.timeframe) {
    conditions.push(eq(setupOutcomes.timeframe, params.timeframe));
  }
  if (params.playbookId) {
    const playbook = params.playbookId;
    if (playbook.startsWith("gold-swing")) {
      conditions.push(or(eq(setupOutcomes.playbookId, playbook), ilike(setupOutcomes.playbookId, "gold-swing%")));
    } else {
      conditions.push(eq(setupOutcomes.playbookId, playbook));
    }
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;
  try {
    const limit = Math.min(500, Math.max(1, params.limit ?? 200));
    if (params.mode === "latest") {
      // latest per setupId (keep for optional mode)
      const rows = await db
        .select()
        .from(setupOutcomes)
        .where(whereClause ?? sql`true`)
        .orderBy(desc(setupOutcomes.evaluatedAt))
        .limit(limit);
      const seen = new Set<string>();
      const deduped: SetupOutcomeRow[] = [];
      for (const row of rows) {
        if (seen.has(row.setupId)) continue;
        seen.add(row.setupId);
        deduped.push(row);
      }
      return deduped;
    }

    const query = whereClause
      ? db.select().from(setupOutcomes).where(whereClause)
      : db.select().from(setupOutcomes);
    return query.orderBy(desc(setupOutcomes.evaluatedAt)).limit(limit);
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}
