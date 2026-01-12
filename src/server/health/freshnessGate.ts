import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import { getAssetCandleStats } from "@/src/server/repositories/candleRepository";

export type FreshnessStatus = "ok" | "stale" | "missing";

export type FreshnessCheckResult = {
  timeframe: MarketTimeframe;
  status: FreshnessStatus;
  lastTimestamp?: string;
  ageMinutes?: number;
};

export type AssetFreshness = {
  assetId: string;
  results: FreshnessCheckResult[];
};

export type GateResult = {
  perAsset: AssetFreshness[];
  staleAssets: Array<{ assetId: string; timeframe: MarketTimeframe; ageMinutes?: number }>;
  missingAssets: Array<{ assetId: string; timeframe: MarketTimeframe }>;
  allOk: boolean;
};

function evaluateFreshness(lastTimestamp: Date | null | undefined, now: Date, thresholdMinutes: number): FreshnessCheckResult {
  if (!lastTimestamp) {
    return { timeframe: "1D", status: "missing" } as FreshnessCheckResult;
  }
  const ageMinutes = Math.abs(now.getTime() - lastTimestamp.getTime()) / 60000;
  if (ageMinutes > thresholdMinutes) {
    return { timeframe: "1D", status: "stale", lastTimestamp: lastTimestamp.toISOString(), ageMinutes };
  }
  return { timeframe: "1D", status: "ok", lastTimestamp: lastTimestamp.toISOString(), ageMinutes };
}

export async function gateCandlesPerAsset(params: {
  assetIds: string[];
  timeframes: MarketTimeframe[];
  thresholdsByTimeframe: Partial<Record<MarketTimeframe, number>>;
  now?: Date;
}): Promise<GateResult> {
  const now = params.now ?? new Date();
  const stats = await getAssetCandleStats({
    assetIds: params.assetIds,
    timeframes: params.timeframes,
  });
  const latestMap = new Map<string, Date | null>();
  for (const row of stats) {
    latestMap.set(`${row.assetId}-${row.timeframe}`, row.lastTimestamp ? new Date(row.lastTimestamp) : null);
  }

  const perAsset: AssetFreshness[] = [];
  const staleAssets: GateResult["staleAssets"] = [];
  const missingAssets: GateResult["missingAssets"] = [];

  for (const assetId of params.assetIds) {
    const results: FreshnessCheckResult[] = [];
    for (const tf of params.timeframes) {
      const lastTs = latestMap.get(`${assetId}-${tf}`);
      const threshold = params.thresholdsByTimeframe[tf] ?? Number.POSITIVE_INFINITY;
      const check = evaluateFreshness(lastTs ?? undefined, now, threshold);
      results.push({ ...check, timeframe: tf });
      if (check.status === "stale") {
        staleAssets.push({ assetId, timeframe: tf, ageMinutes: check.ageMinutes });
      }
      if (check.status === "missing") {
        missingAssets.push({ assetId, timeframe: tf });
      }
    }
    perAsset.push({ assetId, results });
  }

  const allOk = staleAssets.length === 0 && missingAssets.length === 0;
  return { perAsset, staleAssets, missingAssets, allOk };
}
