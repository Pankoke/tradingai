import { performance } from "node:perf_hooks";
import { sql, gte, and, lte, eq } from "drizzle-orm";
import { db } from "@/src/server/db/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { perceptionSnapshotItems } from "@/src/server/db/schema/perceptionSnapshotItems";
import { candles } from "@/src/server/db/schema/candles";
import { events } from "@/src/server/db/schema/events";
import { assets } from "@/src/server/db/schema/assets";
import { listAuditRuns } from "@/src/server/repositories/auditRunRepository";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";

type CountResult = { value: number | string | null };

type AppHealth = {
  url: string;
  ok: boolean;
  statusCode?: number;
  message?: string;
};

type DbHealth = {
  ok: boolean;
  pingMs?: number;
  nowMs?: number;
  readTestMs?: number;
  error?: string;
};

type CountStats = {
  snapshotsTotal: number;
  snapshotsLast7d: number;
  snapshotItemsTotal: number;
  snapshotItemsLast7d: number;
  candlesTotal: number;
  candlesLast7d: number;
  eventsTotal: number;
  eventsUpcoming7d: number;
  assetsTotal: number;
  assetsActive: number;
};

type SizeStats = {
  available: boolean;
  databaseBytes?: number;
  tables?: Record<string, number>;
  error?: string;
};

type JobHealth = {
  label: string;
  action: string;
  lastRunAt?: string | null;
  status: "ok" | "stale" | "missing";
  durationMs?: number | null;
  notes?: string[];
};

type JobHealthSummary = {
  jobs: JobHealth[];
};

type SnapshotFreshness = {
  label: string;
  ageMinutes: number | null;
  status: "ok" | "stale" | "missing";
  snapshotId?: string;
};

type SnapshotFreshnessSummary = {
  daily: SnapshotFreshness;
  intraday: SnapshotFreshness;
};

export type SystemHealthReport = {
  appHealth: AppHealth;
  dbHealth: DbHealth;
  counts: CountStats;
  sizes: SizeStats;
  jobs?: JobHealthSummary;
  snapshots?: SnapshotFreshnessSummary;
  generatedAt: string;
};

const TABLES_FOR_SIZE = [
  "perception_snapshots",
  "perception_snapshot_items",
  "candles",
  "events",
];

const JOBS: Array<{ label: string; action: string; staleMinutes: number }> = [
  { label: "Marketdata Daily", action: "marketdata_sync", staleMinutes: 24 * 60 },
  { label: "Marketdata Intraday", action: "marketdata.intraday_sync", staleMinutes: 2 * 60 },
  { label: "Perception Daily", action: "snapshot_build", staleMinutes: 24 * 60 },
  { label: "Perception Intraday", action: "perception_intraday", staleMinutes: 2 * 60 },
  { label: "Events Ingest", action: "events.ingest", staleMinutes: 24 * 60 },
  { label: "Events Enrich", action: "events.enrich", staleMinutes: 24 * 60 },
];

function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function fetchAppHealth(): Promise<AppHealth> {
  const url = new URL("/api/health/perception", resolveBaseUrl()).toString();
  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    return {
      url,
      ok: response.ok,
      statusCode: response.status,
      message: text.slice(0, 300),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}

async function measureDbHealth(): Promise<DbHealth> {
  const health: DbHealth = { ok: true };
  try {
    const pingStart = performance.now();
    await db.execute(sql`SELECT 1`);
    health.pingMs = performance.now() - pingStart;

    const nowStart = performance.now();
    await db.execute(sql`SELECT now()`);
    health.nowMs = performance.now() - nowStart;

    const readStart = performance.now();
    await db.select().from(perceptionSnapshots).limit(1);
    health.readTestMs = performance.now() - readStart;
  } catch (error) {
    health.ok = false;
    health.error = error instanceof Error ? error.message : "DB error";
  }
  return health;
}

async function countRows(table: unknown, condition?: unknown): Promise<number> {
  const builder = db.select({ value: sql<number>`count(*)` }).from(table as never);
  const rows = condition ? await builder.where(condition as never) : await builder;
  const [result] = rows;
  return Number(result?.value ?? 0);
}

async function gatherCounts(): Promise<CountStats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const upcomingUntil = new Date(now);
  upcomingUntil.setDate(upcomingUntil.getDate() + 7);

  const [
    snapshotsTotal,
    snapshotsLast7d,
    snapshotItemsTotal,
    snapshotItemsLast7d,
    candlesTotal,
    candlesLast7d,
    eventsTotal,
    eventsUpcoming7d,
    assetsTotal,
    assetsActive,
  ] = await Promise.all([
    countRows(perceptionSnapshots),
    countRows(perceptionSnapshots, gte(perceptionSnapshots.snapshotTime, sevenDaysAgo)),
    countRows(perceptionSnapshotItems),
    countRows(perceptionSnapshotItems, gte(perceptionSnapshotItems.createdAt, sevenDaysAgo)),
    countRows(candles),
    countRows(candles, gte(candles.timestamp, sevenDaysAgo)),
    countRows(events),
    countRows(events, and(gte(events.scheduledAt, now), lte(events.scheduledAt, upcomingUntil))),
    countRows(assets),
    countRows(assets, eq(assets.isActive, true)),
  ]);

  return {
    snapshotsTotal,
    snapshotsLast7d,
    snapshotItemsTotal,
    snapshotItemsLast7d,
    candlesTotal,
    candlesLast7d,
    eventsTotal,
    eventsUpcoming7d,
    assetsTotal,
    assetsActive,
  };
}

async function gatherSizes(): Promise<SizeStats> {
  try {
    const databaseSizeResult = await db.execute(sql<{ size: number }>`SELECT pg_database_size(current_database()) as size`);
    const databaseBytes = Number(databaseSizeResult[0]?.size ?? 0);
    const tables: Record<string, number> = {};
    for (const table of TABLES_FOR_SIZE) {
      const result = await db.execute(
        sql<{ size: number }>`SELECT pg_total_relation_size(${sql.raw(`'${table}'::regclass`)}) as size`,
      );
      tables[table] = Number(result[0]?.size ?? 0);
    }
    return { available: true, databaseBytes, tables };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : "Size query failed",
    };
  }
}

async function loadJobHealth(): Promise<JobHealthSummary> {
  const jobs: JobHealth[] = [];
  for (const job of JOBS) {
    const runs = await listAuditRuns({ filters: { action: job.action }, limit: 1 });
    const run = runs.runs[0];
    let status: JobHealth["status"] = "missing";
    const lastRunAt: string | null | undefined = run?.createdAt?.toISOString?.() ?? null;
    if (run) {
      const ageMinutes = lastRunAt ? (Date.now() - new Date(lastRunAt).getTime()) / 60000 : Infinity;
      status = ageMinutes > job.staleMinutes ? "stale" : "ok";
      if (run.error) status = "missing";
    }
    jobs.push({
      label: job.label,
      action: job.action,
      lastRunAt,
      status,
      durationMs: run?.durationMs ?? null,
      notes: run?.message ? [run.message] : undefined,
    });
  }
  return { jobs };
}

async function loadSnapshotFreshness(): Promise<SnapshotFreshnessSummary> {
  const [daily, intraday] = await Promise.all([
    getLatestSnapshot({ excludeLabel: "intraday" }),
    getLatestSnapshot({ label: "intraday" }),
  ]);

  const dailyAge = daily?.snapshot.snapshotTime
    ? (Date.now() - new Date(daily.snapshot.snapshotTime).getTime()) / 60000
    : null;
  const intradayAge = intraday?.snapshot.snapshotTime
    ? (Date.now() - new Date(intraday.snapshot.snapshotTime).getTime()) / 60000
    : null;

  const dailyFresh: SnapshotFreshness = {
    label: "Daily Snapshot",
    ageMinutes: dailyAge,
    status: dailyAge == null ? "missing" : dailyAge > 12 * 60 ? "stale" : "ok",
    snapshotId: daily?.snapshot.id,
  };
  const intradayFresh: SnapshotFreshness = {
    label: "Intraday Snapshot",
    ageMinutes: intradayAge,
    status: intradayAge == null ? "missing" : intradayAge > 90 ? "stale" : "ok",
    snapshotId: intraday?.snapshot.id,
  };

  return { daily: dailyFresh, intraday: intradayFresh };
}

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  const [appHealth, dbHealth, counts, sizes, jobs, snapshots] = await Promise.all([
    fetchAppHealth(),
    measureDbHealth(),
    gatherCounts(),
    gatherSizes(),
    loadJobHealth(),
    loadSnapshotFreshness(),
  ]);

  return {
    appHealth,
    dbHealth,
    counts,
    sizes,
    jobs,
    snapshots,
    generatedAt: new Date().toISOString(),
  };
}
