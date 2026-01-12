import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";

export const FRESHNESS_THRESHOLDS_MINUTES: Record<
  "intraday" | "swing" | "outcomes" | "derived",
  Partial<Record<MarketTimeframe, number>> & { snapshotMinutes?: number }
> = {
  intraday: {
    "1H": 180,
    "4H": 480,
  },
  swing: {
    "1D": 4320, // 72h
    "1W": 20160, // 14d
  },
  derived: {
    "4H": 480,
  },
  outcomes: {
    snapshotMinutes: 720, // 12h
    "1D": 4320,
    "1W": 20160,
  },
};
