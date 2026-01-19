import { config } from "dotenv";
import "tsconfig-paths/register";

import { and, gte, or } from "drizzle-orm";
import { format } from "node:util";
import type { Setup } from "@/src/lib/engine/types";

const MS_DAY = 24 * 60 * 60 * 1000;

// Load env (.env.local preferred for local dev)
config({ path: ".env.local", override: true });
config();

type Counter = Record<string, number>;

function inc(counter: Counter, key: string, by = 1) {
  if (!key) return;
  counter[key] = (counter[key] ?? 0) + by;
}

function fmtDate(v: Date | string | null | undefined): string {
  if (!v) return "-";
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toISOString();
}

function printTable(title: string, rows: Array<[string, number]>) {
  console.log(`\n${title}`);
  console.log("----------------------------------------");
  for (const [k, v] of rows) {
    console.log(`${k.padEnd(24, " ")} ${v.toString().padStart(8, " ")}`);
  }
}

async function main() {
  const daysArg = Number.parseInt(process.argv[2] ?? "", 10);
  const days = Number.isFinite(daysArg) && daysArg > 0 ? daysArg : 30;
  const from = new Date(Date.now() - days * MS_DAY);

  // Lazy-load DB after envs are loaded
  const { db } = await import("@/src/server/db/db");
  const { perceptionSnapshots } = await import("@/src/server/db/schema/perceptionSnapshots");

  console.log(format("Audit window: last %d days (from %s)", days, fmtDate(from)));

  const snapshots = await db
    .select()
    .from(perceptionSnapshots)
    .where(or(gte(perceptionSnapshots.snapshotTime, from), gte(perceptionSnapshots.createdAt, from)))
    .orderBy(perceptionSnapshots.snapshotTime);

  const assetCounts: Counter = {};
  const assetTimeframeCounts: Counter = {};
  const assetLabelCounts: Counter = {};
  const latestSnapshotTime: Record<string, string> = {};

  let totalSetups = 0;

  for (const snap of snapshots) {
    const labelKey = (snap.label ?? "(null)") as string;
    const setups = (snap.setups ?? []) as Array<Setup & Record<string, unknown>>;
    totalSetups += setups.length;
    for (const setup of setups) {
      const assetId = (setup.assetId ?? "").toLowerCase();
      const timeframe = ((setup.timeframeUsed ?? setup.timeframe ?? "") as string).toUpperCase();
      const tfKey = timeframe || "(unknown)";
      inc(assetCounts, assetId);
      inc(assetTimeframeCounts, `${assetId}|${tfKey}`);
      inc(assetLabelCounts, `${assetId}|${labelKey}`);
      const snapTime = snap.snapshotTime ?? snap.createdAt;
      if (assetId && snapTime) {
        latestSnapshotTime[assetId] = fmtDate(snapTime);
      }
    }
  }

  console.log(format("Snapshots in window: %d", snapshots.length));
  console.log(format("Total setups in window: %d", totalSetups));

  const sortedAssets = Object.entries(assetCounts).sort((a, b) => b[1] - a[1]);
  printTable("Asset counts", sortedAssets);

  const sortedAssetTf = Object.entries(assetTimeframeCounts).sort((a, b) => b[1] - a[1]);
  printTable("Asset + Timeframe counts", sortedAssetTf);

  const sortedAssetLabel = Object.entries(assetLabelCounts).sort((a, b) => b[1] - a[1]);
  printTable("Asset + Label counts", sortedAssetLabel);

  console.log("\nLatest snapshotTime per asset:");
  for (const [assetId, ts] of Object.entries(latestSnapshotTime)) {
    console.log(`  ${assetId.padEnd(8, " ")} ${ts}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
