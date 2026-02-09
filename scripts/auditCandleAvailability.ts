import "tsconfig-paths/register";

import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { and, desc, gte, inArray } from "drizzle-orm";
import { config as loadDotenv } from "dotenv";

loadDotenv();
loadDotenv({ path: ".env.local", override: false });

const TARGET_ASSET_KEYS = [
  "wti",
  "silver",
  "gbpusd",
  "usdjpy",
  "eth",
  "gold",
  "dax",
  "spx",
  "ndx",
  "dow",
  "eurusd",
  "eurjpy",
] as const;

const TIMEFRAMES = ["1H", "4H", "1D"] as const;
type TargetTimeframe = (typeof TIMEFRAMES)[number];

type AssetRow = {
  id: string;
  symbol: string;
};

type CandleRow = {
  assetId: string;
  timeframe: string;
  timestamp: Date;
  source: string;
};

type TfStats = {
  count30d: number;
  count60d: number;
  latestTimestamp: Date | null;
  latestSource: string | null;
  sources: Set<string>;
};

type ProviderStats = {
  source: string;
  assetId: string;
  symbol: string;
  timeframe: TargetTimeframe;
  count30d: number;
  count60d: number;
  latestTimestamp: Date | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms while ${label}`)), ms),
    ),
  ]) as Promise<T>;
}

function createEmptyTfStats(): TfStats {
  return {
    count30d: 0,
    count60d: 0,
    latestTimestamp: null,
    latestSource: null,
    sources: new Set<string>(),
  };
}

function createProviderStats(params: {
  source: string;
  assetId: string;
  symbol: string;
  timeframe: TargetTimeframe;
}): ProviderStats {
  return {
    source: params.source,
    assetId: params.assetId,
    symbol: params.symbol,
    timeframe: params.timeframe,
    count30d: 0,
    count60d: 0,
    latestTimestamp: null,
  };
}

function normalizeKey(value: string): string {
  return value.trim().toUpperCase();
}

function formatDate(value: Date | null): string {
  if (!value) return "n/a";
  return value.toISOString();
}

function formatAge(value: Date | null, now: Date): string {
  if (!value) return "n/a";
  const ageMinutes = Math.max(0, Math.round((now.getTime() - value.getTime()) / 60000));
  if (ageMinutes < 60) return `${ageMinutes}m`;
  const ageHours = Math.round((ageMinutes / 60) * 10) / 10;
  if (ageHours < 48) return `${ageHours}h`;
  const ageDays = Math.round((ageHours / 24) * 10) / 10;
  return `${ageDays}d`;
}

function renderFallbackReport(message: string): void {
  const outPath = resolve("reports", "audits", "candle-availability.md");
  const content = `# Candle Availability Audit\n\n${message}\n`;
  writeFileSync(outPath, content, "utf8");
  console.log(`[audit:candles] wrote fallback report: ${outPath}`);
  process.exit(0);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    renderFallbackReport("DATABASE_URL not set. Audit skipped (read-only).\n");
    return;
  }

  let dbModule: typeof import("@/src/server/db");
  let schemaAssetsModule: typeof import("@/src/server/db/schema/assets");
  let schemaCandlesModule: typeof import("@/src/server/db/schema/candles");

  try {
    [dbModule, schemaAssetsModule, schemaCandlesModule] = await Promise.all([
      import("@/src/server/db"),
      import("@/src/server/db/schema/assets"),
      import("@/src/server/db/schema/candles"),
    ]);
  } catch (error) {
    renderFallbackReport(
      `DB modules unavailable: ${error instanceof Error ? error.message : String(error)}. Audit skipped (read-only).`,
    );
    return;
  }

  const db = dbModule.db;
  const assets = schemaAssetsModule.assets;
  const candles = schemaCandlesModule.candles;

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const targetSet = new Set(TARGET_ASSET_KEYS.map((key) => normalizeKey(key)));

  const allAssets = (await withTimeout(
    db.select({ id: assets.id, symbol: assets.symbol }).from(assets),
    20000,
    "loading assets",
  )) as AssetRow[];

  const selectedAssets = allAssets.filter((asset) => {
    const id = normalizeKey(asset.id);
    const symbol = normalizeKey(asset.symbol);
    return targetSet.has(id) || targetSet.has(symbol);
  });

  if (!selectedAssets.length) {
    renderFallbackReport("No matching target assets found in assets table.");
    return;
  }

  const selectedAssetIds = selectedAssets.map((asset) => asset.id);

  const recentCandles = (await withTimeout(
    db
      .select({
        assetId: candles.assetId,
        timeframe: candles.timeframe,
        timestamp: candles.timestamp,
        source: candles.source,
      })
      .from(candles)
      .where(
        and(
          inArray(candles.assetId, selectedAssetIds),
          inArray(candles.timeframe, [...TIMEFRAMES]),
          gte(candles.timestamp, since60),
        ),
      )
      .orderBy(desc(candles.timestamp)),
    20000,
    "loading candles",
  )) as CandleRow[];

  const stats = new Map<string, TfStats>();
  const assetById = new Map(selectedAssets.map((asset) => [asset.id, asset]));
  const providerStats = new Map<string, ProviderStats>();

  for (const row of recentCandles) {
    const tf = row.timeframe.toUpperCase() as TargetTimeframe;
    if (!TIMEFRAMES.includes(tf)) continue;
    const key = `${row.assetId}|${tf}`;
    const entry = stats.get(key) ?? createEmptyTfStats();
    entry.count60d += 1;
    if (row.timestamp >= since30) {
      entry.count30d += 1;
    }
    if (!entry.latestTimestamp || row.timestamp > entry.latestTimestamp) {
      entry.latestTimestamp = row.timestamp;
      entry.latestSource = row.source;
    }
    entry.sources.add(row.source);
    stats.set(key, entry);

    const asset = assetById.get(row.assetId);
    if (!asset) continue;
    const providerKey = `${row.source}|${row.assetId}|${tf}`;
    const providerEntry =
      providerStats.get(providerKey) ??
      createProviderStats({
        source: row.source,
        assetId: row.assetId,
        symbol: asset.symbol,
        timeframe: tf,
      });
    providerEntry.count60d += 1;
    if (row.timestamp >= since30) {
      providerEntry.count30d += 1;
    }
    if (!providerEntry.latestTimestamp || row.timestamp > providerEntry.latestTimestamp) {
      providerEntry.latestTimestamp = row.timestamp;
    }
    providerStats.set(providerKey, providerEntry);
  }

  const lines: string[] = [];
  lines.push("# Candle Availability Audit");
  lines.push("");
  lines.push(`- Source: DB candles table (read-only)`);
  lines.push(`- GeneratedAt: ${now.toISOString()}`);
  lines.push(`- Assets (matched): ${selectedAssets.map((asset) => `${asset.id}(${asset.symbol})`).join(", ")}`);
  lines.push(`- Timeframes: ${TIMEFRAMES.join(", ")}`);
  lines.push("");
  lines.push("| assetId | symbol | timeframe | count30d | count60d | latestTimestamp | age | latestSource | sources | status |");
  lines.push("| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |");

  for (const asset of selectedAssets.sort((a, b) => a.id.localeCompare(b.id))) {
    for (const timeframe of TIMEFRAMES) {
      const key = `${asset.id}|${timeframe}`;
      const entry = stats.get(key) ?? createEmptyTfStats();
      const freshness = formatAge(entry.latestTimestamp, now);
      const status = entry.count60d > 0 ? "available" : "missing";
      lines.push(
        `| ${asset.id} | ${asset.symbol} | ${timeframe} | ${entry.count30d} | ${entry.count60d} | ${formatDate(entry.latestTimestamp)} | ${freshness} | ${entry.latestSource ?? "n/a"} | ${Array.from(entry.sources).sort().join(",") || "n/a"} | ${status} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Provider/Source Summary (last 60d)");
  lines.push("");
  lines.push("| source | assetId | symbol | timeframe | count30d | count60d | latestTimestamp |");
  lines.push("| --- | --- | --- | --- | ---: | ---: | --- |");
  const providerRows = Array.from(providerStats.values()).sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    if (a.assetId !== b.assetId) return a.assetId.localeCompare(b.assetId);
    return a.timeframe.localeCompare(b.timeframe);
  });
  if (!providerRows.length) {
    lines.push("| n/a | n/a | n/a | n/a | 0 | 0 | n/a |");
  } else {
    for (const row of providerRows) {
      lines.push(
        `| ${row.source} | ${row.assetId} | ${row.symbol} | ${row.timeframe} | ${row.count30d} | ${row.count60d} | ${formatDate(row.latestTimestamp)} |`,
      );
    }
  }

  const outPath = resolve("reports", "audits", "candle-availability.md");
  writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
  console.log(`[audit:candles] wrote report: ${outPath}`);
  process.exit(0);
}

main().catch((error) => {
  renderFallbackReport(`Audit failed: ${error instanceof Error ? error.message : String(error)}`);
});
