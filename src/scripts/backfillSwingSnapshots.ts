#!/usr/bin/env ts-node
import "dotenv/config";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";
import { getSnapshotByTime } from "@/src/server/repositories/perceptionSnapshotRepository";

type CliOptions = {
  days: number;
  chunkDays: number;
  assetId?: string;
  dryRun: boolean;
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = { days: 90, chunkDays: 7, dryRun: false };
  for (const arg of args) {
    if (arg.startsWith("--days=")) opts.days = Number(arg.split("=")[1]) || 90;
    if (arg.startsWith("--chunkDays=")) opts.chunkDays = Number(arg.split("=")[1]) || 7;
    if (arg.startsWith("--assetId=")) opts.assetId = arg.split("=")[1];
    if (arg === "--dry-run" || arg === "--dryrun") opts.dryRun = true;
  }
  return opts;
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildDateChunks(days: number, chunkDays: number): Date[][] {
  const end = startOfDayUtc(new Date());
  const all: Date[] = [];
  for (let i = days; i >= 0; i -= 1) {
    const d = new Date(end.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    all.push(d);
  }
  const chunks: Date[][] = [];
  for (let i = 0; i < all.length; i += chunkDays) {
    chunks.push(all.slice(i, i + chunkDays));
  }
  return chunks;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function backfill() {
  const opts = parseArgs();
  console.log(
    `[backfill-swing] start days=${opts.days} chunkDays=${opts.chunkDays} dryRun=${opts.dryRun} assetId=${
      opts.assetId ?? "all"
    }`,
  );

  if (opts.assetId) {
    console.warn("[backfill-swing] assetId filter currently informational only; engine runs full universe.");
  }

  const chunks = buildDateChunks(opts.days, opts.chunkDays);
  let built = 0;
  let skipped = 0;
  let errors = 0;

  for (const chunk of chunks) {
    for (const date of chunk) {
      const asOf = startOfDayUtc(date);
      const existing = await getSnapshotByTime({ snapshotTime: asOf });
      if (existing) {
        skipped += 1;
        continue;
      }
      if (opts.dryRun) {
        console.log(`[backfill-swing] dry-run would build snapshot ${asOf.toISOString()}`);
        built += 1;
        continue;
      }
      try {
        await buildAndStorePerceptionSnapshot({
          snapshotTime: asOf,
          allowSync: false,
          profiles: ["SWING"],
          source: "cron",
          assetFilter: opts.assetId ? [opts.assetId] : undefined,
        });
        built += 1;
        console.log(`[backfill-swing] built snapshot ${asOf.toISOString()}`);
      } catch (error) {
        errors += 1;
        console.error(`[backfill-swing] failed for ${asOf.toISOString()}`, error);
      }
      await sleep(300);
    }
    await sleep(500);
  }

  console.log(`[backfill-swing] done built=${built} skipped=${skipped} errors=${errors}`);
}

if (require.main === module) {
  backfill().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { buildDateChunks };
