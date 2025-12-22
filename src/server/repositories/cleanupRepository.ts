import { and, sql } from "drizzle-orm";
import { db, candles, biasSnapshots, events, perceptionSnapshotItems } from "@/src/server/db";
import { auditRuns } from "@/src/server/db/schema/auditRuns";

type CountResult = { value: number };

async function safeCount(query: () => Promise<CountResult[]>): Promise<number> {
  try {
    const [result] = await query();
    return Number(result?.value ?? 0);
  } catch (error) {
    if (isMissingTableError(error)) {
      return 0;
    }
    throw error;
  }
}

function isMissingTableError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const { code, cause } = error as { code?: string; cause?: { code?: string } };
    if (code === "42P01" || cause?.code === "42P01") {
      return true;
    }
  }
  if (error instanceof Error) {
    return /relation .* does not exist/i.test(error.message) || error.message.includes("table") && error.message.includes("does not exist");
  }
  return false;
}

function lessThan(column: string, cutoff: Date) {
  return sql`${sql.raw(column)} < ${cutoff.toISOString()}`;
}

export async function countOldCandles(cutoff: Date): Promise<number> {
  return safeCount(() =>
    db
      .select({ value: sql<number>`count(*)` })
      .from(candles)
      .where(sql`${candles.timestamp} < ${cutoff}`),
  );
}

export async function countOldBiasSnapshots(cutoff: Date): Promise<number> {
  return safeCount(() =>
    db
      .select({ value: sql<number>`count(*)` })
      .from(biasSnapshots)
      .where(sql`${biasSnapshots.createdAt} < ${cutoff}`),
  );
}

export async function countOldPerceptionSnapshotItems(cutoff: Date): Promise<number> {
  return safeCount(() =>
    db
      .select({ value: sql<number>`count(*)` })
      .from(perceptionSnapshotItems)
      .where(sql`${perceptionSnapshotItems.createdAt} < ${cutoff}`),
  );
}

export async function countOldEvents(highImpactCutoff: Date, lowImpactCutoff: Date): Promise<{ high: number; low: number }> {
  const high = await safeCount(() =>
    db
      .select({ value: sql<number>`count(*)` })
      .from(events)
      .where(sql`${events.scheduledAt} < ${highImpactCutoff} AND ${events.impact} >= 3`),
  );
  const low = await safeCount(() =>
    db
      .select({ value: sql<number>`count(*)` })
      .from(events)
      .where(sql`${events.scheduledAt} < ${lowImpactCutoff} AND ${events.impact} < 3`),
  );
  return { high, low };
}

export async function countOldAuditRuns(cutoff: Date): Promise<number> {
  return safeCount(() =>
    db
      .select({ value: sql<number>`count(*)` })
      .from(auditRuns)
      .where(sql`${auditRuns.createdAt} < ${cutoff}`),
  );
}
