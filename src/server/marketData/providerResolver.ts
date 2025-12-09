import { YahooMarketDataProvider } from "@/src/server/providers/yahooMarketDataProvider";
import { BinanceMarketDataProvider } from "@/src/server/marketData/binanceMarketDataProvider";
import type { MarketDataProvider } from "./MarketDataProvider";
import type { Asset } from "@/src/server/repositories/assetRepository";
import { resolvePreferredSource } from "./assetProviderMapping";

const yahooProvider = new YahooMarketDataProvider();
const binanceProvider = new BinanceMarketDataProvider();

type ProviderMode = "yahoo" | "binance" | "mixed";

const MARKET_PROVIDER_MODE: ProviderMode =
  (process.env.MARKET_PROVIDER_MODE as ProviderMode) ?? "yahoo";

export function resolveMarketDataProvider(asset: Asset): MarketDataProvider {
  const preferred = resolvePreferredSource(asset);

  switch (MARKET_PROVIDER_MODE) {
    case "binance":
      return preferred.provider === "binance" ? binanceProvider : yahooProvider;
    case "mixed":
      return preferred.provider === "binance" ? binanceProvider : yahooProvider;
    case "yahoo":
    default:
      return yahooProvider;
  }
}
