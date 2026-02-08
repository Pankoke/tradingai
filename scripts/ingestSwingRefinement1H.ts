import "tsconfig-paths/register";

import { config as loadDotenv } from "dotenv";
import {
  ingestSwingRefinementOneHourCandles,
  normalizeAssetKeys,
} from "@/src/scripts/swingRefinement1hIngest";

loadDotenv();
loadDotenv({ path: ".env.local", override: false });

function parseTargetKeys(value: string | undefined): string[] {
  if (!value) return normalizeAssetKeys();
  return normalizeAssetKeys(value.split(","));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[ingest:swing-refinement:1h] DATABASE_URL not set; skipping.");
    process.exit(0);
  }

  const lookbackDaysRaw = Number(process.env.SWING_REFINEMENT_1H_DAYS ?? "60");
  const lookbackDays = Number.isFinite(lookbackDaysRaw) && lookbackDaysRaw > 0 ? lookbackDaysRaw : 60;
  const targetKeys = parseTargetKeys(process.env.SWING_REFINEMENT_1H_ASSETS);

  const [{ getActiveAssets }, { syncDailyCandlesForAsset }] = await Promise.all([
    import("@/src/server/repositories/assetRepository"),
    import("@/src/features/marketData/syncDailyCandles"),
  ]);

  const activeAssets = await getActiveAssets();
  const result = await ingestSwingRefinementOneHourCandles({
    activeAssets,
    deps: { syncDailyCandlesForAsset },
    lookbackDays,
    targetKeys,
  });

  console.log(
    `[ingest:swing-refinement:1h] assets=${result.selectedAssetIds.length}, lookbackDays=${lookbackDays}, calls=${result.syncCalls.length}`,
  );
  if (result.skippedAssetKeys.length) {
    console.log(`[ingest:swing-refinement:1h] skipped target keys: ${result.skippedAssetKeys.join(", ")}`);
  }
  for (const call of result.syncCalls) {
    console.log(
      `[ingest:swing-refinement:1h] ${call.assetId} (${call.symbol}) tf=${call.timeframe} inserted=${call.inserted} provider=${call.provider ?? "n/a"}`,
    );
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("[ingest:swing-refinement:1h] failed", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
