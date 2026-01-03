import "dotenv/config";
import "tsconfig-paths/register";

import { format } from "node:util";
import { getCandlesForAsset, getLatestCandleForAsset } from "@/src/server/repositories/candleRepository";
import { listOutcomesForWindow } from "@/src/server/repositories/setupOutcomeRepository";

const DAY_MS = 24 * 60 * 60 * 1000;

type Args = {
  assetId?: string;
  symbol?: string;
  playbookId?: string;
  days: number;
  limit: number;
};

function parseArgs(): Args {
  const raw = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((arg) => arg.startsWith("--"))
      .map((arg) => {
        const [key, value] = arg.replace(/^--/, "").split("=");
        return [key, value ?? "true"];
      }),
  );
  const days = Number(raw.days ?? 30);
  const limit = Number(raw.limit ?? 200);
  return {
    assetId: raw.assetId as string | undefined,
    symbol: raw.symbol as string | undefined,
    playbookId: raw.playbookId as string | undefined,
    days: Number.isFinite(days) && days > 0 ? days : 30,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 200,
  };
}

async function resolveAssetIdFromPlaybook(playbookId: string, days: number): Promise<string | undefined> {
  const from = new Date(Date.now() - days * DAY_MS);
  const rows = await listOutcomesForWindow({
    from,
    profile: "SWING",
    timeframe: "1D",
    playbookId,
    limit: 50,
  });
  const first = rows[0];
  return first?.assetId;
}

function summarize(values: number[]): { min: number; max: number; median: number; mean: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return { min, max, median, mean };
}

async function main(): Promise<void> {
  const args = parseArgs();
  let assetId = args.assetId;
  if (!assetId && args.playbookId) {
    assetId = await resolveAssetIdFromPlaybook(args.playbookId, args.days);
  }
  if (!assetId) {
    console.error("Please provide --assetId or --playbookId to resolve an asset.");
    process.exit(1);
  }

  const to = new Date();
  const from = new Date(Date.now() - args.days * DAY_MS);
  const candles = await getCandlesForAsset({
    assetId,
    timeframe: "1D",
    from,
    to,
  });
  const window = candles.slice(0, Math.min(args.limit, candles.length));
  const closes = window.map((c) => Number(c.close)).filter((v) => Number.isFinite(v));
  const highs = window.map((c) => Number(c.high)).filter((v) => Number.isFinite(v));
  const lows = window.map((c) => Number(c.low)).filter((v) => Number.isFinite(v));
  const mid = window.map((c) => (Number(c.high) + Number(c.low)) / 2).filter((v) => Number.isFinite(v));

  const latest = await getLatestCandleForAsset({ assetId, timeframe: "1D" });

  const summary = {
    assetId,
    playbookId: args.playbookId ?? null,
    days: args.days,
    fetched: candles.length,
    used: window.length,
    from: window[window.length - 1]?.timestamp?.toISOString() ?? null,
    to: window[0]?.timestamp?.toISOString() ?? null,
    stats: {
      close: closes.length ? summarize(closes) : null,
      high: highs.length ? summarize(highs) : null,
      low: lows.length ? summarize(lows) : null,
      mid: mid.length ? summarize(mid) : null,
    },
    sample: {
      first: window[window.length - 1] ?? null,
      last: window[0] ?? null,
      latestInDb: latest ?? null,
    },
  };

  console.log(format("%j", summary));
  console.log("\nReadable summary:");
  console.log(`Asset: ${assetId}, playbook: ${args.playbookId ?? "-"}, days=${args.days}, candles used=${window.length}/${candles.length}`);
  if (summary.stats.mid) {
    console.log(
      `Mid stats: median=${summary.stats.mid.median.toFixed(2)} min=${summary.stats.mid.min.toFixed(
        2,
      )} max=${summary.stats.mid.max.toFixed(2)}`,
    );
  }
}

main().catch((error) => {
  console.error("asset sanity failed", error);
  process.exit(1);
});
