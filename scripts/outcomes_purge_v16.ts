#!/usr/bin/env ts-node
import "dotenv/config";
import "tsconfig-paths/register";

import { parseArgs } from "node:util";
import { db } from "@/src/server/db/db";
import { setupOutcomes } from "@/src/server/db/schema/setupOutcomes";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { and, lt, eq, sql, inArray } from "drizzle-orm";

type Args = {
  before: Date;
  playbookId?: string;
  dryRun: boolean;
  forceEvaluatedAtMode: boolean;
};

function parse(): Args {
  const { values } = parseArgs({
    options: {
      before: { type: "string", required: true },
      playbookId: { type: "string" },
      dryRun: { type: "boolean" },
      forceEvaluatedAtMode: { type: "boolean" },
    },
  });
  const before = values.before ? new Date(values.before) : null;
  if (!before || Number.isNaN(before.getTime())) {
    throw new Error("--before must be a valid ISO datetime");
  }
  return {
    before,
    playbookId: values.playbookId,
    dryRun: values.dryRun ?? false,
    forceEvaluatedAtMode: values.forceEvaluatedAtMode ?? false,
  };
}

async function purgeBySnapshotDate(args: Args) {
  const conditions = [lt(perceptionSnapshots.createdAt, args.before)];
  if (args.playbookId) {
    conditions.push(eq(setupOutcomes.playbookId, args.playbookId));
  }
  const candidates = await db
    .select({ id: setupOutcomes.id })
    .from(setupOutcomes)
    .innerJoin(perceptionSnapshots, eq(perceptionSnapshots.id, setupOutcomes.snapshotId))
    .where(and(...conditions))
    .limit(10_000);

  const ids = candidates.map((c) => c.id);
  if (!ids.length) {
    return { scanned: 0, deleted: 0, samples: [] as string[] };
  }
  if (args.dryRun) {
    return { scanned: ids.length, deleted: 0, samples: ids.slice(0, 10) };
  }
  const batchSize = 500;
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    await db.delete(setupOutcomes).where(inArray(setupOutcomes.id, chunk));
  }
  return { scanned: ids.length, deleted: ids.length, samples: ids.slice(0, 10) };
}

async function purgeByEvaluatedDate(args: Args) {
  const conditions = [lt(setupOutcomes.evaluatedAt, args.before)];
  if (args.playbookId) {
    conditions.push(eq(setupOutcomes.playbookId, args.playbookId));
  }
  const candidates = await db
    .select({ id: setupOutcomes.id })
    .from(setupOutcomes)
    .where(and(...conditions))
    .limit(10_000);
  const ids = candidates.map((c) => c.id);
  if (!ids.length) {
    return { scanned: 0, deleted: 0, samples: [] as string[] };
  }
  if (args.dryRun) {
    return { scanned: ids.length, deleted: 0, samples: ids.slice(0, 10) };
  }
  const batchSize = 500;
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    await db.delete(setupOutcomes).where(inArray(setupOutcomes.id, chunk));
  }
  return { scanned: ids.length, deleted: ids.length, samples: ids.slice(0, 10) };
}

async function main(): Promise<void> {
  const args = parse();
  const mode = args.forceEvaluatedAtMode ? "evaluatedAt" : "snapshotCreatedAt";
  const result = args.forceEvaluatedAtMode ? await purgeByEvaluatedDate(args) : await purgeBySnapshotDate(args);

  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify(
      {
        mode,
        before: args.before.toISOString(),
        playbookId: args.playbookId ?? null,
        dryRun: args.dryRun,
        ...result,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
