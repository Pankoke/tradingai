import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";

const INTRADAY_BASE: MarketTimeframe[] = ["4H", "1H"];
const SCALP_TIMEFRAME: MarketTimeframe = "15m";

function isScalpEnabled(): boolean {
  return process.env.ENABLE_SCALP_CANDLES === "1";
}

export function getAllowedIntradayTimeframes(): MarketTimeframe[] {
  const allowed = [...INTRADAY_BASE];
  if (isScalpEnabled()) {
    allowed.push(SCALP_TIMEFRAME);
  }
  return allowed;
}

export function isTimeframeAllowed(timeframe: MarketTimeframe): boolean {
  if (timeframe === "1D" || timeframe === "1W") return true;
  const allowed = new Set(getAllowedIntradayTimeframes());
  return allowed.has(timeframe);
}

export function filterAllowedTimeframes(timeframes: MarketTimeframe[]): MarketTimeframe[] {
  const allowed = new Set<MarketTimeframe>(["1D", "1W", ...getAllowedIntradayTimeframes()]);
  return timeframes.filter((tf) => allowed.has(tf));
}
