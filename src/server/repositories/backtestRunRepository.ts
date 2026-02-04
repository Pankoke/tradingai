import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/db";
import { backtestRuns } from "../db/schema/backtestRuns";

export type BacktestRun = typeof backtestRuns["$inferSelect"];
export type BacktestRunInsert = typeof backtestRuns["$inferInsert"];
export type BacktestRunMeta = Omit<BacktestRun, "trades">;

export async function upsertBacktestRun(params: BacktestRunInsert): Promise<void> {
  const id = params.id ?? randomUUID();
  await db
    .insert(backtestRuns)
    .values({ ...params, id })
    .onConflictDoUpdate({
      target: backtestRuns.runKey,
      set: {
        assetId: params.assetId,
        fromIso: params.fromIso,
        toIso: params.toIso,
        stepHours: params.stepHours,
        costsConfig: params.costsConfig,
        exitPolicy: params.exitPolicy,
        kpis: params.kpis,
        reportPath: params.reportPath,
        trades: params.trades,
      },
    });
}

export async function getBacktestRunByKey(runKey: string): Promise<BacktestRun | undefined> {
  const [row] = await db.select().from(backtestRuns).where(eq(backtestRuns.runKey, runKey)).limit(1);
  return row;
}

export async function listRecentBacktestRuns(limit = 20): Promise<BacktestRun[]> {
  return db.select().from(backtestRuns).orderBy(desc(backtestRuns.createdAt)).limit(limit);
}

export async function listRecentBacktestRunsMeta(limit = 20): Promise<BacktestRunMeta[]> {
  const rows = await db
    .select({
      id: backtestRuns.id,
      runKey: backtestRuns.runKey,
      assetId: backtestRuns.assetId,
      fromIso: backtestRuns.fromIso,
      toIso: backtestRuns.toIso,
      stepHours: backtestRuns.stepHours,
      costsConfig: backtestRuns.costsConfig,
      exitPolicy: backtestRuns.exitPolicy,
      kpis: backtestRuns.kpis,
      reportPath: backtestRuns.reportPath,
      createdAt: backtestRuns.createdAt,
    })
    .from(backtestRuns)
    .orderBy(desc(backtestRuns.createdAt))
    .limit(limit);
  return rows;
}
