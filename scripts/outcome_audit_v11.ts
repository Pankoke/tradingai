import "dotenv/config";
import "tsconfig-paths/register";

import { format } from "node:util";
import { listOutcomesForWindow, type SetupOutcomeRow } from "@/src/server/repositories/setupOutcomeRepository";
import { getSnapshotWithItems } from "@/src/server/repositories/perceptionSnapshotRepository";
import type { Setup } from "@/src/lib/engine/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type Args = {
  playbookId: string;
  days: number;
  limit: number;
};

type OutcomeCounts = Record<string, number>;

type OutcomeExample = {
  outcomeId: string;
  setupId: string;
  snapshotId: string;
  outcomeStatus: string;
  outcomeAt: Date | null;
  expiryAt: Date | null;
  entryZone: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
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

  const playbookId = (raw.playbookId as string | undefined) ?? "gold-swing-v0.2";
  const days = Number(raw.days ?? 180);
  const limit = Number(raw.limit ?? 500);

  return {
    playbookId,
    days: Number.isFinite(days) && days > 0 ? days : 180,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 500,
  };
}

function countByStatus(outcomes: SetupOutcomeRow[]): OutcomeCounts {
  return outcomes.reduce<OutcomeCounts>((acc, row) => {
    acc[row.outcomeStatus] = (acc[row.outcomeStatus] ?? 0) + 1;
    return acc;
  }, {});
}

function formatPct(numerator: number, denominator: number): string {
  if (!denominator) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function inferExpiryAt(snapshotTime: Date, windowBars: number | null | undefined): Date | null {
  if (!windowBars) return null;
  return new Date(snapshotTime.getTime() + windowBars * DAY_MS);
}

async function buildExamples(outcomes: SetupOutcomeRow[], maxPerStatus = 3): Promise<Record<string, OutcomeExample[]>> {
  const byStatus: Record<string, OutcomeExample[]> = {};

  for (const outcome of outcomes) {
    const status = outcome.outcomeStatus;
    if ((byStatus[status]?.length ?? 0) >= maxPerStatus) continue;

    const snapshot = await getSnapshotWithItems(outcome.snapshotId);
    const setup =
      snapshot?.setups?.find((s) => s.id === outcome.setupId) ??
      (snapshot?.snapshot.setups as Setup[] | undefined)?.find((s) => s.id === outcome.setupId);

    const snapshotTime =
      (snapshot?.snapshot.snapshotTime as Date | string | undefined) ?? outcome.evaluatedAt ?? new Date();
    const snapshotDate = snapshotTime instanceof Date ? snapshotTime : new Date(snapshotTime);

    byStatus[status] = [
      ...(byStatus[status] ?? []),
      {
        outcomeId: outcome.id,
        setupId: outcome.setupId,
        snapshotId: outcome.snapshotId,
        outcomeStatus: outcome.outcomeStatus,
        outcomeAt: outcome.outcomeAt ?? null,
        expiryAt: inferExpiryAt(snapshotDate, outcome.windowBars),
        entryZone: setup?.entryZone ?? null,
        stopLoss: setup?.stopLoss ?? null,
        takeProfit: setup?.takeProfit ?? null,
      },
    ];
  }

  return byStatus;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const from = new Date(Date.now() - args.days * DAY_MS);

  const outcomes = await listOutcomesForWindow({
    from,
    profile: "SWING",
    timeframe: "1D",
    playbookId: args.playbookId,
    limit: args.limit,
    mode: "all",
  });

  if (!outcomes.length) {
    console.log("No outcomes found for given filters.");
    return;
  }

  const counts = countByStatus(outcomes);
  const closed = (counts.hit_tp ?? 0) + (counts.hit_sl ?? 0) + (counts.expired ?? 0) + (counts.ambiguous ?? 0);
  const hitRate = formatPct(counts.hit_tp ?? 0, (counts.hit_tp ?? 0) + (counts.hit_sl ?? 0));
  const expiryRate = formatPct(counts.expired ?? 0, closed);

  const examples = await buildExamples(outcomes);

  const summary = {
    playbookId: args.playbookId,
    days: args.days,
    limitRequested: args.limit,
    total: outcomes.length,
    counts,
    metrics: {
      hitRate,
      expiryRate,
    },
    samples: {
      hit_tp: examples.hit_tp ?? [],
      hit_sl: examples.hit_sl ?? [],
      expired: examples.expired ?? [],
      ambiguous: examples.ambiguous ?? [],
      open: examples.open ?? [],
    },
  };

  console.log(format("%j", summary));
  console.log("\nReadable summary:");
  console.log(`Total outcomes: ${outcomes.length}`);
  console.log(`TP: ${counts.hit_tp ?? 0}, SL: ${counts.hit_sl ?? 0}, Expired: ${counts.expired ?? 0}, Ambiguous: ${counts.ambiguous ?? 0}, Open: ${counts.open ?? 0}`);
  console.log(`HitRate (TP/(TP+SL)): ${hitRate}, ExpiryRate (Expired/Closed): ${expiryRate}`);
}

main().catch((error) => {
  console.error("Outcome audit failed", error);
  process.exit(1);
});
