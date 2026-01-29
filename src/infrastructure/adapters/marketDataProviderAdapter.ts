import type { MarketDataProviderPort } from "@/src/domain/market-data/ports";
import type { CandleTimeframe, NormalizedCandle } from "@/src/domain/market-data/types";
import { resolveMarketDataProviders } from "@/src/server/marketData/providerResolver";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import { getAssetBySymbol } from "@/src/server/repositories/assetRepository";

export class MarketDataProviderAdapter implements MarketDataProviderPort {
  async fetchCandles(params: {
    symbol: string;
    timeframe: CandleTimeframe;
    from: Date;
    to: Date;
  }): Promise<NormalizedCandle[]> {
    const asset = await getAssetBySymbol(params.symbol);
    if (!asset) {
      return [];
    }

    const timeframe = params.timeframe as MarketTimeframe;
    const { primary, fallback } = resolveMarketDataProviders({ asset, timeframe });

    const fetchFrom = (provider: typeof primary) =>
      provider.fetchCandles({
        asset,
        timeframe,
        from: params.from,
        to: params.to,
      });

    let candles = await fetchFrom(primary);
    if (!candles.length && fallback) {
      const fallbackCandles = await fetchFrom(fallback);
      if (fallbackCandles.length) {
        candles = fallbackCandles;
      }
    }

    return candles;
  }
}
