import { performance } from "node:perf_hooks";
import { sql, gte, and, lte, eq } from "drizzle-orm";
import { db } from "@/src/server/db/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { perceptionSnapshotItems } from "@/src/server/db/schema/perceptionSnapshotItems";
import { candles } from "@/src/server/db/schema/candles";
import { events } from "@/src/server/db/schema/events";
import { assets } from "@/src/server/db/schema/assets";

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

export type SystemHealthReport = {
  appHealth: AppHealth;
  dbHealth: DbHealth;
  counts: CountStats;
  sizes: SizeStats;
  generatedAt: string;
};

const TABLES_FOR_SIZE = [
  "perception_snapshots",
  "perception_snapshot_items",
  "candles",
  "events",
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

async function countRows(table: any, condition?: any): Promise<number> {
  const builder = db.select({ value: sql<number>`count(*)` }).from(table);
  const rows = condition ? await builder.where(condition) : await builder;
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

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  const [appHealth, dbHealth, counts, sizes] = await Promise.all([
    fetchAppHealth(),
    measureDbHealth(),
    gatherCounts(),
    gatherSizes(),
  ]);

  return {
    appHealth,
    dbHealth,
    counts,
    sizes,
    generatedAt: new Date().toISOString(),
  };
}
