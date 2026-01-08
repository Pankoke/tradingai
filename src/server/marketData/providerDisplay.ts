import type { Asset } from "@/src/server/repositories/assetRepository";
import { mapAssetSymbolToBinance, type MarketDataSource } from "@/src/server/marketData/MarketDataProvider";

function normalize(value?: string | null): string {
  return (value ?? "").toUpperCase();
}

function resolveTwelveDataSymbol(asset: Asset): string {
  const upperSymbol = normalize(asset.symbol);
  const upperId = normalize(asset.id);
  if (asset.assetClass === "crypto") {
    if (upperSymbol.includes("BTC")) return "BTC/USD";
    if (upperSymbol.includes("ETH")) return "ETH/USD";
  }
  if (upperSymbol === "GC=F" || upperSymbol === "GOLD" || upperSymbol === "XAUUSD" || upperSymbol === "XAUUSD=X" || upperId === "GOLD") {
    return "XAU/USD";
  }
  return upperSymbol || upperId || "UNKNOWN";
}

export function resolveProviderSymbolForSource(asset: Asset, provider: MarketDataSource): string {
  const upperSymbol = normalize(asset.symbol);
  const upperId = normalize(asset.id);

  if (provider === "twelvedata") {
    return resolveTwelveDataSymbol(asset);
  }
  if (provider === "binance") {
    const mapped = mapAssetSymbolToBinance(asset.symbol);
    return mapped ?? upperSymbol ?? upperId ?? "UNKNOWN";
  }
  if (provider === "yahoo" || provider === "polygon") {
    return upperSymbol || upperId || "UNKNOWN";
  }
  return upperSymbol || upperId || "UNKNOWN";
}
