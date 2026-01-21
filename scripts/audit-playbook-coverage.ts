import "dotenv/config";
import { format } from "node:util";

import { and, gte } from "drizzle-orm";

import { resolvePlaybookWithReason } from "@/src/lib/engine/playbooks";
import type { Playbook } from "@/src/lib/engine/playbooks";
import type { Setup } from "@/src/lib/engine/types";
import { db } from "@/src/server/db/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";

type SnapshotRow = typeof perceptionSnapshots.$inferSelect;

type Key = {
  assetId: string;
  timeframe: string;
  label: string;
};

type Stats = {
  snapshots: number;
  setups: number;
  latestSnapshotTime: Date | null;
  playbookId: string | null;
  playbookReason: string | null;
};

const daysArg = Number.parseInt(process.argv[2] ?? "", 10);
const daysBack = Number.isFinite(daysArg) && daysArg > 0 ? daysArg : 30;

function normalizeKey(setup: Setup, label: string): Key {
  const assetId = ((setup.assetId ?? setup.symbol ?? "") || "unknown").toLowerCase();
  const timeframe = ((setup.timeframeUsed ?? setup.timeframe ?? "") || "unknown").toLowerCase();
  return { assetId, timeframe, label: label || "(null)" };
}

function resolvePlaybookMeta(setup: Setup): { id: string | null; reason: string | null; playbook?: Playbook } {
  try {
    const asset = {
      id: (setup.assetId ?? setup.symbol ?? "") || null,
      symbol: (setup.symbol ?? setup.assetId ?? "") || "",
      name: (setup as { asset?: { name?: string | null } }).asset?.name ?? null,
    };
    const profile = (setup.profile ?? "").toString() || null;
    const resolution = resolvePlaybookWithReason(asset, profile);
    return { id: resolution.playbook.id, reason: resolution.reason, playbook: resolution.playbook };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Playbook resolve error", err);
    return { id: null, reason: null };
  }
}

async function main(): Promise<void> {
  const from = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(perceptionSnapshots)
    .where(and(gte(perceptionSnapshots.snapshotTime, from)));

  const stats = new Map<string, Stats>();
  let totalSnapshots = 0;
  let totalSetups = 0;

  for (const row of rows as SnapshotRow[]) {
    totalSnapshots += 1;
    const setups = Array.isArray(row.setups) ? (row.setups as Setup[]) : [];
    totalSetups += setups.length;
    const label = (row.label ?? "(null)").toString();
    for (const setup of setups) {
      const key = normalizeKey(setup, label);
      const keyStr = `${key.assetId}|${key.timeframe}|${key.label}`;
      const current = stats.get(keyStr) ?? {
        snapshots: 0,
        setups: 0,
        latestSnapshotTime: null,
        playbookId: null,
        playbookReason: null,
      };
      current.snapshots += 1;
      current.setups += 1;
      const snapTime = row.snapshotTime ?? row.createdAt ?? null;
      if (snapTime && (!current.latestSnapshotTime || snapTime > current.latestSnapshotTime)) {
        current.latestSnapshotTime = snapTime;
      }
      if (!current.playbookId) {
        const resolved = resolvePlaybookMeta(setup);
        current.playbookId = resolved.id;
        current.playbookReason = resolved.reason;
      }
      stats.set(keyStr, current);
    }
  }

  // Aggregate by asset/timeframe
  const lines: string[] = [];
  lines.push(`Audit window: last ${daysBack} days (from ${from.toISOString()})`);
  lines.push(`Total snapshots: ${totalSnapshots}`);
  lines.push(`Total setups: ${totalSetups}`);
  lines.push("");
  lines.push("| Asset | Timeframe | Label | Snapshots | Setups | Latest Snapshot | Playbook | Resolver Reason |");
  lines.push("| --- | --- | --- | ---: | ---: | --- | --- | --- |");

  const sortedKeys = Array.from(stats.entries()).sort((a, b) => b[1].setups - a[1].setups);
  for (const [keyStr, value] of sortedKeys) {
    const [assetId, timeframe, label] = keyStr.split("|");
    lines.push(
      format(
        "| %s | %s | %s | %d | %d | %s | %s | %s |",
        assetId,
        timeframe,
        label,
        value.snapshots,
        value.setups,
        value.latestSnapshotTime ? new Date(value.latestSnapshotTime).toISOString() : "n/a",
        value.playbookId ?? "n/a",
        value.playbookReason ?? "n/a",
      ),
    );
  }

  // Assets missing in summaries/report can be inferred manually from this table.
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

