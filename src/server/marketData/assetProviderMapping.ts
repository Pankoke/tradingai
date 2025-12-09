import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketDataSource } from "./MarketDataProvider";

/**
 * Lightweight mapping for phase 1: only a few crypto symbols are supported via Binance.
 * Everything else defaults to Yahoo.
 */
const BINANCE_CRYPTO_SYMBOLS = new Set([
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "LTCUSDT",
]);

export function resolvePreferredSource(asset: Asset): {
  provider: MarketDataSource;
  providerSymbol: string;
} {
  const symbol = asset.symbol.toUpperCase();

  if (asset.assetClass === "crypto" && BINANCE_CRYPTO_SYMBOLS.has(symbol)) {
    return { provider: "binance", providerSymbol: symbol };
  }

  return { provider: "yahoo", providerSymbol: symbol };
}
