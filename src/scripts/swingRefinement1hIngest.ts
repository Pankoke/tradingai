import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";

export const DEFAULT_SWING_REFINEMENT_1H_ASSETS = [
  "wti",
  "silver",
  "gbpusd",
  "usdjpy",
  "eth",
  "gold",
] as const;

export type SwingRefinementOneHourIngestDeps = {
  syncDailyCandlesForAsset: (params: {
    asset: Asset;
    from: Date;
    to: Date;
    timeframe?: MarketTimeframe;
  }) => Promise<
    {
      timeframe: MarketTimeframe;
      inserted: number;
      provider: string;
      fallbackUsed?: boolean;
      rateLimited?: boolean;
    }[]
  >;
};

export type SwingRefinementOneHourIngestResult = {
  targetKeys: string[];
  selectedAssetIds: string[];
  skippedAssetKeys: string[];
  syncCalls: Array<{
    assetId: string;
    symbol: string;
    timeframe: "1H";
    from: Date;
    to: Date;
    inserted: number;
    provider: string | null;
    fallbackUsed: boolean;
    rateLimited: boolean;
  }>;
};

export function normalizeAssetKeys(rawKeys?: readonly string[]): string[] {
  if (!rawKeys?.length) {
    return [...DEFAULT_SWING_REFINEMENT_1H_ASSETS].map((v) => v.toUpperCase());
  }
  return Array.from(new Set(rawKeys.map((v) => v.trim().toUpperCase()).filter(Boolean)));
}

export function selectSwingRefinementAssets(activeAssets: Asset[], targetKeys: readonly string[]): Asset[] {
  const target = new Set(targetKeys.map((v) => v.toUpperCase()));
  return activeAssets.filter((asset) => {
    const id = (asset.id ?? "").toUpperCase();
    const symbol = (asset.symbol ?? "").toUpperCase();
    return target.has(id) || target.has(symbol);
  });
}

export async function ingestSwingRefinementOneHourCandles(params: {
  activeAssets: Asset[];
  deps: SwingRefinementOneHourIngestDeps;
  now?: Date;
  lookbackDays?: number;
  targetKeys?: readonly string[];
}): Promise<SwingRefinementOneHourIngestResult> {
  const now = params.now ?? new Date();
  const lookbackDays = Number.isFinite(params.lookbackDays) && (params.lookbackDays ?? 0) > 0 ? Number(params.lookbackDays) : 60;
  const from = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const targetKeys = normalizeAssetKeys(params.targetKeys);
  const selectedAssets = selectSwingRefinementAssets(params.activeAssets, targetKeys);

  const selectedAssetIds = selectedAssets.map((asset) => asset.id);
  const selectedKeys = new Set<string>();
  for (const asset of selectedAssets) {
    selectedKeys.add((asset.id ?? "").toUpperCase());
    selectedKeys.add((asset.symbol ?? "").toUpperCase());
  }

  const skippedAssetKeys = targetKeys.filter((key) => !selectedKeys.has(key));
  const syncCalls: SwingRefinementOneHourIngestResult["syncCalls"] = [];

  for (const asset of selectedAssets) {
    const result = await params.deps.syncDailyCandlesForAsset({
      asset,
      timeframe: "1H",
      from,
      to: now,
    });
    const tfResult = result.find((item) => item.timeframe === "1H");
    syncCalls.push({
      assetId: asset.id,
      symbol: asset.symbol,
      timeframe: "1H",
      from,
      to: now,
      inserted: tfResult?.inserted ?? 0,
      provider: tfResult?.provider ?? null,
      fallbackUsed: Boolean(tfResult?.fallbackUsed),
      rateLimited: Boolean(tfResult?.rateLimited),
    });
  }

  return {
    targetKeys,
    selectedAssetIds,
    skippedAssetKeys,
    syncCalls,
  };
}
