#!/usr/bin/env ts-node
import "dotenv/config";
import "tsconfig-paths/register";

import { parseArgs } from "node:util";
import { db } from "@/src/server/db/db";
import { setupOutcomes } from "@/src/server/db/schema/setupOutcomes";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { FIX_DATE } from "@/src/server/services/outcomePolicy";
import { eq, and, gte, or, isNull } from "drizzle-orm";

type Parsed = {
  all: boolean;
  dryRun: boolean;
  limit: number;
};

function parse(): Parsed {
  const { values } = parseArgs({
    options: {
      all: { type: "boolean" },
      dryRun: { type: "boolean" },
      limit: { type: "string" },
    },
  });
  return {
    all: values.all ?? false,
    dryRun: values.dryRun ?? false,
    limit: values.limit ? Number(values.limit) : 1000,
  };
}

async function main(): Promise<void> {
  const args = parse();
  const boundary = args.all ? null : FIX_DATE;

  const rows = await db
    .select({
      id: setupOutcomes.id,
      snapshotId: setupOutcomes.snapshotId,
    })
    .from(setupOutcomes)
    .where(
      and(
        or(isNull(setupOutcomes.setupEngineVersion), eq(setupOutcomes.setupEngineVersion, "")),
        boundary ? gte(setupOutcomes.evaluatedAt, boundary) : undefined,
      ),
    )
    .limit(args.limit);

  if (!rows.length) {
    // eslint-disable-next-line no-console
    console.info("No outcomes without setup_engine_version found");
    return;
  }

  let updated = 0;
  const samples: string[] = [];

  for (const row of rows) {
    const [snap] = await db
      .select({ version: perceptionSnapshots.version })
      .from(perceptionSnapshots)
      .where(eq(perceptionSnapshots.id, row.snapshotId))
      .limit(1);
    const version = snap?.version ?? process.env.SETUP_ENGINE_VERSION ?? "unknown";
    if (args.dryRun) {
      if (samples.length < 10) samples.push(row.id);
      updated += 1;
      continue;
    }
    await db
      .update(setupOutcomes)
      .set({ setupEngineVersion: version })
      .where(eq(setupOutcomes.id, row.id));
    updated += 1;
    if (samples.length < 10) samples.push(row.id);
  }

  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify(
      {
        scanned: rows.length,
        updated,
        dryRun: args.dryRun,
        boundary: boundary?.toISOString() ?? "all",
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
