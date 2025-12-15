import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/src/server/db/db";
import { auditRuns } from "@/src/server/db/schema/auditRuns";

export type AuditRun = typeof auditRuns.$inferSelect;

export type AuditRunFilters = {
  action?: string;
  source?: string;
  ok?: boolean;
};

export async function createAuditRun(params: {
  action: string;
  source: string;
  ok: boolean;
  durationMs?: number;
  message?: string | null;
  error?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  const id = randomUUID();
  const payload = {
    id,
    action: params.action,
    source: params.source,
    ok: params.ok,
    durationMs: params.durationMs ?? null,
    message: params.message ?? null,
    error: params.error ? truncate(params.error, 1000) : null,
    meta: params.meta ? sanitizeMeta(params.meta) : null,
  };
  try {
    await db.insert(auditRuns).values(payload);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }
}

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const serialized = JSON.stringify(meta);
  if (serialized.length <= 2000) {
    return meta;
  }
  return { truncated: true };
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

export async function listAuditRuns(params: {
  filters?: AuditRunFilters;
  limit?: number;
  offset?: number;
}): Promise<{ runs: AuditRun[]; total: number }> {
  const limit = Math.min(200, Math.max(1, params.limit ?? 50));
  const offset = Math.max(0, params.offset ?? 0);
  const where = buildWhere(params.filters);

  try {
    const runsQuery = where
      ? db.select().from(auditRuns).where(where).orderBy(desc(auditRuns.createdAt)).limit(limit).offset(offset)
      : db.select().from(auditRuns).orderBy(desc(auditRuns.createdAt)).limit(limit).offset(offset);

    const countQuery = where
      ? db.select({ value: sql<number>`count(*)` }).from(auditRuns).where(where)
      : db.select({ value: sql<number>`count(*)` }).from(auditRuns);

    const [runs, countResult] = await Promise.all([runsQuery, countQuery]);
    return { runs, total: Number(countResult[0]?.value ?? 0) };
  } catch (error) {
    if (isMissingTableError(error)) {
      return { runs: [], total: 0 };
    }
    throw error;
  }
}

function isMissingTableError(error: unknown): boolean {
  if (typeof error === "object" && error) {
    const err = error as { code?: string; cause?: { code?: string } };
    if (err.code === "42P01") return true;
    if (err.cause && err.cause.code === "42P01") return true;
  }
  if (error instanceof Error) {
    return error.message.includes("audit_runs") && error.message.includes("does not exist");
  }
  return false;
}

function buildWhere(filters?: AuditRunFilters) {
  if (!filters) return undefined;
  const conditions = [];
  if (filters.action) {
    conditions.push(eq(auditRuns.action, filters.action));
  }
  if (filters.source) {
    conditions.push(eq(auditRuns.source, filters.source));
  }
  if (typeof filters.ok === "boolean") {
    conditions.push(eq(auditRuns.ok, filters.ok));
  }
  if (!conditions.length) return undefined;
  return and(...conditions);
}
