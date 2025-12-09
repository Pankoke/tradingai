import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketTimeframe } from "./MarketDataProvider";

const BASE_TIMEFRAMES: MarketTimeframe[] = ["1D"];
const CRYPTO_TIMEFRAMES: MarketTimeframe[] = ["1D", "4H", "1H", "15m"];

export const TIMEFRAME_SYNC_WINDOWS: Record<MarketTimeframe, number> = {
  "1D": 180,
  "4H": 90,
  "1H": 30,
  "15m": 7,
};

export function getTimeframesForAsset(asset: Asset): MarketTimeframe[] {
  if (asset.assetClass === "crypto") {
    return CRYPTO_TIMEFRAMES;
  }
  return BASE_TIMEFRAMES;
}
