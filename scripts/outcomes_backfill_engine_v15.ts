#!/usr/bin/env ts-node
import "dotenv/config";
import "tsconfig-paths/register";

import { parseArgs } from "node:util";
import { and, gte, isNull, or, eq } from "drizzle-orm";
import { db } from "@/src/server/db/db";
import { setupOutcomes } from "@/src/server/db/schema/setupOutcomes";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { FIX_DATE } from "@/src/server/services/outcomePolicy";

type Parsed = {
  from: Date;
  limit: number;
  dryRun: boolean;
  playbookId?: string;
};

function parse(): Parsed {
  const { values } = parseArgs({
    options: {
      from: { type: "string" },
      limit: { type: "string" },
      dryRun: { type: "boolean" },
      playbookId: { type: "string" },
    },
  });
  const fromArg = values.from ? new Date(values.from) : FIX_DATE;
  const limit = values.limit ? Number(values.limit) : 5000;
  return {
    from: Number.isFinite(fromArg.getTime()) ? fromArg : FIX_DATE,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 5000,
    dryRun: values.dryRun ?? false,
    playbookId: values.playbookId,
  };
}

async function main(): Promise<void> {
  const args = parse();
  const conditions = [
    or(isNull(setupOutcomes.setupEngineVersion), eq(setupOutcomes.setupEngineVersion, "")),
    gte(setupOutcomes.evaluatedAt, args.from),
  ];
  if (args.playbookId) {
    conditions.push(eq(setupOutcomes.playbookId, args.playbookId));
  }

  const rows = await db
    .select({ id: setupOutcomes.id, snapshotId: setupOutcomes.snapshotId })
    .from(setupOutcomes)
    .where(and(...conditions))
    .limit(args.limit);

  let updated = 0;
  let filledUnknown = 0;
  const samples: string[] = [];

  for (const row of rows) {
    const [snap] = await db
      .select({ version: perceptionSnapshots.version })
      .from(perceptionSnapshots)
      .where(eq(perceptionSnapshots.id, row.snapshotId))
      .limit(1);
    const version = snap?.version ?? process.env.SETUP_ENGINE_VERSION ?? "unknown";
    if (!args.dryRun) {
      await db
        .update(setupOutcomes)
        .set({ setupEngineVersion: version })
        .where(eq(setupOutcomes.id, row.id));
    }
    if (version === "unknown") filledUnknown += 1;
    updated += 1;
    if (samples.length < 10) samples.push(`${row.id}=>${version}`);
  }

  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify(
      {
        scanned: rows.length,
        updated,
        filledUnknown,
        from: args.from.toISOString(),
        playbookId: args.playbookId ?? null,
        dryRun: args.dryRun,
        samples,
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
