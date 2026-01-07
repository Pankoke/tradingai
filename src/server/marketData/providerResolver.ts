import { YahooMarketDataProvider } from "@/src/server/providers/yahooMarketDataProvider";
import { BinanceMarketDataProvider } from "@/src/server/marketData/binanceMarketDataProvider";
import { TwelveDataMarketDataProvider } from "@/src/server/marketData/twelvedataMarketDataProvider";
import type { MarketDataProvider, MarketTimeframe } from "./MarketDataProvider";
import type { Asset } from "@/src/server/repositories/assetRepository";
import { resolvePreferredSource } from "./assetProviderMapping";

const yahooProvider = new YahooMarketDataProvider();
const binanceProvider = new BinanceMarketDataProvider();
const twelveDataProvider = new TwelveDataMarketDataProvider();

type ProviderMode = "yahoo" | "binance" | "mixed";

const MARKET_PROVIDER_MODE: ProviderMode =
  (process.env.MARKET_PROVIDER_MODE as ProviderMode) ?? "yahoo";

type ResolvedProviders = {
  primary: MarketDataProvider;
  fallback?: MarketDataProvider;
};

export function resolveMarketDataProviders(params: { asset: Asset; timeframe: MarketTimeframe }): ResolvedProviders {
  const { asset, timeframe } = params;
  const preferred = resolvePreferredSource(asset);
  const prefersBinance = preferred.provider === "binance";
  const isIntraday = timeframe === "1H" || timeframe === "4H" || timeframe === "15m";

  // Base defaults
  let primary: MarketDataProvider = yahooProvider;
  let fallback: MarketDataProvider | undefined = twelveDataProvider;

  if (asset.assetClass === "crypto") {
    if (isIntraday) {
      primary = prefersBinance ? binanceProvider : binanceProvider;
      fallback = twelveDataProvider;
    } else {
      primary = prefersBinance ? yahooProvider : yahooProvider;
      fallback = twelveDataProvider;
    }
  } else {
    if (isIntraday) {
      primary = twelveDataProvider;
      fallback = yahooProvider;
    } else {
      primary = yahooProvider;
      fallback = twelveDataProvider;
    }
  }

  // Respect global mode toggle (kept for compatibility)
  switch (MARKET_PROVIDER_MODE) {
    case "binance":
      if (prefersBinance) {
        primary = binanceProvider;
        fallback = twelveDataProvider;
      }
      break;
    case "mixed":
      // already TF-aware above
      break;
    case "yahoo":
    default:
      // already defaulted to yahoo/twelveData for non-crypto; binance for crypto intraday
      break;
  }

  return { primary, fallback };
}

// Backward-compatible helper: returns only primary
export function resolveMarketDataProvider(asset: Asset, timeframe: MarketTimeframe = "1D"): MarketDataProvider {
  return resolveMarketDataProviders({ asset, timeframe }).primary;
}
