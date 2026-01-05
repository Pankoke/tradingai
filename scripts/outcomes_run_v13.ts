#!/usr/bin/env ts-node
import "dotenv/config";
import { parseArgs } from "node:util";
import { runOutcomeEvaluationBatch } from "@/src/server/services/outcomeEvaluationRunner";
import { FIX_DATE, ENV_OUTCOMES_VALID_FROM } from "@/src/server/services/outcomePolicy";

async function main() {
  const { values } = parseArgs({
    options: {
      days: { type: "string" },
      limit: { type: "string" },
      assetId: { type: "string" },
      playbookId: { type: "string" },
      dryRun: { type: "boolean" },
      from: { type: "string" },
      windowBars: { type: "string" },
      ignorePolicy: { type: "boolean" },
    },
  });

  const daysBack = values.days ? Number(values.days) : undefined;
  const limit = values.limit ? Number(values.limit) : undefined;
  const windowBars = values.windowBars ? Number(values.windowBars) : undefined;
  const from = values.from ? new Date(values.from) : undefined;

  const result = await runOutcomeEvaluationBatch({
    daysBack,
    limit,
    assetId: values.assetId,
    playbookId: values.playbookId,
    dryRun: values.dryRun ?? false,
    from,
    windowBars,
    ignorePolicy: values.ignorePolicy ?? false,
  });

  const effectiveFrom = from ?? new Date(Date.now() - (daysBack ?? 30) * 24 * 60 * 60 * 1000);
  const topReasons = Object.entries(result.reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }));
  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify(
      {
        from: effectiveFrom.toISOString(),
        policyFrom: FIX_DATE.toISOString(),
        envOutcomesValidFrom: ENV_OUTCOMES_VALID_FROM ?? null,
        ignorePolicy: values.ignorePolicy ?? false,
        dryRun: values.dryRun ?? false,
        limit: result.processed,
        metrics: result.metrics,
        inserted: result.inserted,
        updated: result.updated,
        unchanged: result.unchanged,
        reasons: topReasons,
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
