import * as dotenv from "dotenv";
import { randomInt } from "node:crypto";
import { getActiveAssets, type Asset } from "@/src/server/repositories/assetRepository";
import { resolveMarketDataProvider } from "@/src/server/marketData/providerResolver";
import { upsertCandles, getCandlesForAsset } from "@/src/server/repositories/candleRepository";
import { aggregateWeeklyFromDaily } from "@/src/features/marketData/syncDailyCandles";
import type { CandleDomainModel } from "@/src/server/providers/marketDataProvider";

dotenv.config({ path: ".env.local" });

type Args = {
  dryRun: boolean;
  assetId?: string;
  days: number;
  chunkDays: number;
};

type Chunk = { from: Date; to: Date };

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    days: 730,
    chunkDays: 90,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    if (arg.startsWith("--assetId=")) args.assetId = arg.split("=")[1];
    if (arg.startsWith("--days=")) args.days = Math.max(1, Number(arg.split("=")[1] ?? "730"));
    if (arg.startsWith("--chunkDays=")) args.chunkDays = Math.max(1, Number(arg.split("=")[1] ?? "90"));
  }
  return args;
}

export function buildDateChunks(from: Date, to: Date, chunkDays: number): Chunk[] {
  if (from > to) return [];
  const msPerDay = 24 * 60 * 60 * 1000;
  const chunks: Chunk[] = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    const end = new Date(Math.min(to.getTime(), cursor.getTime() + (chunkDays - 1) * msPerDay));
    chunks.push({ from: new Date(cursor), to: end });
    cursor = new Date(end.getTime() + msPerDay);
  }
  return chunks;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfillAsset(asset: Asset, args: Args, endBoundary: Date): Promise<{ daily: number; weekly: number }> {
  const provider = resolveMarketDataProvider(asset);
  const from = new Date(endBoundary);
  from.setDate(from.getDate() - args.days);
  const chunks = buildDateChunks(from, endBoundary, args.chunkDays);
  let dailyInserted = 0;

  for (const chunk of chunks) {
    const candles: CandleDomainModel[] = await provider.fetchCandles({
      asset,
      timeframe: "1D",
      from: chunk.from,
      to: chunk.to,
    });

    if (!candles.length) {
      console.log(`[backfill] ${asset.symbol} ${chunk.from.toISOString()} - ${chunk.to.toISOString()}: no data`);
      await sleep(randomInt(300, 801));
      continue;
    }

    if (!args.dryRun) {
      await upsertCandles(
        candles.map((c) => ({
          assetId: c.assetId,
          timeframe: c.timeframe,
          timestamp: c.timestamp,
          open: String(c.open),
          high: String(c.high),
          low: String(c.low),
          close: String(c.close),
          volume: c.volume !== undefined ? String(c.volume) : undefined,
          source: c.source,
        })),
      );
    }

    dailyInserted += candles.length;
    console.log(
      `[backfill] ${asset.symbol} ${chunk.from.toISOString().slice(0, 10)} - ${chunk.to
        .toISOString()
        .slice(0, 10)} | fetched=${candles.length} (provider=${provider.provider})`,
    );
    await sleep(randomInt(300, 801));
  }

  let weeklyInserted = 0;
  if (!args.dryRun) {
    const dailyCandles = await getCandlesForAsset({
      assetId: asset.id,
      timeframe: "1D",
      from,
      to: endBoundary,
    });
    const weekly = aggregateWeeklyFromDaily(
      dailyCandles.map((c) => ({
        assetId: c.assetId,
        timeframe: "1D",
        timestamp: c.timestamp,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume ?? 0),
        source: c.source,
      })),
    );
    if (weekly.length) {
      await upsertCandles(
        weekly.map((c) => ({
          assetId: c.assetId,
          timeframe: "1W",
          timestamp: c.timestamp,
          open: String(c.open),
          high: String(c.high),
          low: String(c.low),
          close: String(c.close),
          volume: c.volume !== undefined ? String(c.volume) : undefined,
          source: c.source,
        })),
      );
      weeklyInserted = weekly.length;
    }
  }

  return { daily: dailyInserted, weekly: weeklyInserted };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();
  const endBoundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  const assets = await getActiveAssets();
  const filtered = args.assetId ? assets.filter((a) => a.id === args.assetId) : assets;

  console.log(
    `[backfill] starting daily backfill for ${filtered.length} assets | days=${args.days} chunkDays=${args.chunkDays} dryRun=${args.dryRun}`,
  );

  let totalDaily = 0;
  let totalWeekly = 0;
  const errors: Array<{ assetId: string; error: string }> = [];

  for (const asset of filtered) {
    try {
      const { daily, weekly } = await backfillAsset(asset, args, endBoundary);
      totalDaily += daily;
      totalWeekly += weekly;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[backfill] failed for ${asset.symbol}: ${message}`);
      errors.push({ assetId: asset.id, error: message });
    }
  }

  console.log(
    `[backfill] done. assets=${filtered.length} daily=${totalDaily} weekly=${totalWeekly} errors=${errors.length}`,
  );
  if (errors.length) {
    console.log(JSON.stringify(errors, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
