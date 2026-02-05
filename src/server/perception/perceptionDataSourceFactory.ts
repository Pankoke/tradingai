import { createPerceptionDataSource, type PerceptionDataSource, type PerceptionDataSourceDeps } from "@/src/lib/engine/perceptionDataSource";
import type { SetupProfile } from "@/src/lib/config/setupProfile";
import { getContainer } from "@/src/server/container";
import { DbBiasProvider } from "@/src/server/providers/biasProvider";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import {
  getAllowedTimeframesForProfile,
  getProfileTimeframes,
  getSwingCoreTimeframes,
  getSwingRefinementTimeframes,
  getTimeframesForAsset,
  TIMEFRAME_SYNC_WINDOWS,
} from "@/src/server/marketData/timeframeConfig";
import { resolveProviderSymbolForSource } from "@/src/server/marketData/providerDisplay";
import type { MarketDataSource } from "@/src/server/marketData/MarketDataProvider";
import { syncDailyCandlesForAsset } from "@/src/features/marketData/syncDailyCandles";

export function createPerceptionDataSourceFromContainer(config?: {
  allowSync?: boolean;
  profiles?: SetupProfile[];
  assetFilter?: string[];
}): PerceptionDataSource {
  const container = getContainer();

  const deps: PerceptionDataSourceDeps = {
    assets: { getActiveAssets },
    events: container.eventRepo,
    candles: container.candleRepo,
    sentiment: container.sentiment,
    biasProvider: new DbBiasProvider(),
    timeframeConfig: {
      getProfileTimeframes,
      getTimeframesForAsset,
      TIMEFRAME_SYNC_WINDOWS,
      getSwingCoreTimeframes,
      getSwingRefinementTimeframes,
      getAllowedTimeframesForProfile,
    },
    resolveProviderSymbol: (asset, source) =>
      resolveProviderSymbolForSource(asset as never, source as MarketDataSource),
    syncCandles: async ({ asset, timeframe, from, to }) => {
      await syncDailyCandlesForAsset({
        asset: asset as never,
        timeframe,
        from,
        to,
      });
    },
    allowSync: config?.allowSync ?? false,
  };

  return createPerceptionDataSource(deps, {
    profiles: config?.profiles,
    assetFilter: config?.assetFilter,
  });
}
