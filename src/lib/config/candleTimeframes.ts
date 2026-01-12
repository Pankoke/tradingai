import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";

const INTRADAY_BASE: MarketTimeframe[] = ["4H", "1H"];

export function getAllowedIntradayTimeframes(): MarketTimeframe[] {
  return [...INTRADAY_BASE];
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
