import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketTimeframe } from "./MarketDataProvider";
import { filterAllowedTimeframes } from "@/src/lib/config/candleTimeframes";
import type { SetupProfile } from "@/src/lib/config/setupProfile";

const SWING_CORE_TIMEFRAMES: MarketTimeframe[] = ["1D", "1W"];
const SWING_REFINEMENT_TIMEFRAMES: MarketTimeframe[] = ["4H"];
const BASE_TIMEFRAMES: MarketTimeframe[] = SWING_CORE_TIMEFRAMES;
const CRYPTO_TIMEFRAMES: MarketTimeframe[] = ["1D", "1W", "4H", "1H"];
const INTRADAY_WHITELIST_SYMBOLS = new Set<string>([
  "GC=F",
  "GOLD",
  "XAUUSD",
  "XAUUSD=X",
  "^GDAXI",
  "^GSPC",
  "^NDX",
  "^DJI",
  "EURUSD=X",
  "USDJPY=X",
  "EURJPY=X",
  "GBPUSD=X",
  "CL=F",
  "SILVER",
]);

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
  const upperSymbol = (asset.symbol ?? "").toUpperCase();
  if (INTRADAY_WHITELIST_SYMBOLS.has(upperSymbol)) {
    return filterAllowedTimeframes(["1D", "1W", "4H", "1H"]);
  }
  return filterAllowedTimeframes(BASE_TIMEFRAMES);
}

export function getSwingCoreTimeframes(): MarketTimeframe[] {
  return [...SWING_CORE_TIMEFRAMES];
}

export function getSwingRefinementTimeframes(): MarketTimeframe[] {
  return [...SWING_REFINEMENT_TIMEFRAMES];
}

export function getAllowedTimeframesForProfile(
  profile: SetupProfile,
  options?: { includeRefinement?: boolean },
): MarketTimeframe[] {
  if (profile === "SWING") {
    const includeRefinement = options?.includeRefinement === true;
    const frames = includeRefinement
      ? [...SWING_CORE_TIMEFRAMES, ...SWING_REFINEMENT_TIMEFRAMES]
      : [...SWING_CORE_TIMEFRAMES];
    return frames;
  }
  if (profile === "POSITION") {
    return ["1W"];
  }
  if (profile === "INTRADAY") {
    return ["1H", "4H"];
  }
  return [...SWING_CORE_TIMEFRAMES];
}

export function getProfileTimeframes(profile: SetupProfile, asset: Asset): MarketTimeframe[] {
  void asset; // asset currently unused; kept for signature compatibility
  return getAllowedTimeframesForProfile(profile);
}
