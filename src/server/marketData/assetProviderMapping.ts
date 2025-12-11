import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketDataSource } from "./MarketDataProvider";
import { mapAssetSymbolToBinance } from "./MarketDataProvider";

export function resolvePreferredSource(asset: Asset): {
  provider: MarketDataSource;
  providerSymbol: string;
} {
  if (asset.assetClass === "crypto") {
    const mapped = mapAssetSymbolToBinance(asset.symbol);
    if (mapped) {
      return { provider: "binance", providerSymbol: mapped };
    }
  }

  return { provider: "yahoo", providerSymbol: asset.symbol.toUpperCase() };
}
