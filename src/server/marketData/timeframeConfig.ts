import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketTimeframe } from "./MarketDataProvider";
import { filterAllowedTimeframes } from "@/src/lib/config/candleTimeframes";

const BASE_TIMEFRAMES: MarketTimeframe[] = ["1D", "1W"];
const CRYPTO_TIMEFRAMES: MarketTimeframe[] = ["1D", "1W", "4H", "1H", "15m"];

export const TIMEFRAME_SYNC_WINDOWS: Record<MarketTimeframe, number> = {
  "1D": 180,
  "4H": 90,
  "1H": 30,
  "15m": 7,
  "1W": 730,
};

export function getTimeframesForAsset(asset: Asset): MarketTimeframe[] {
  if (asset.assetClass === "crypto") {
    return filterAllowedTimeframes(CRYPTO_TIMEFRAMES);
  }
  return filterAllowedTimeframes(BASE_TIMEFRAMES);
}
