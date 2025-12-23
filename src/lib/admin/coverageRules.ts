export type TimeframeStatus = "ok" | "stale" | "missing";

const THRESHOLDS_MINUTES: Record<string, number> = {
  "1H": 180, // 3h
  "4H": 480, // 8h (~2 candles)
  "1D": 72 * 60, // 72h
  "1W": 14 * 24 * 60, // 14 days
  "15m": 90, // align with intraday tolerance
};

export function classifyTimeframeStatus(timeframe: string, ageMinutes: number | null | undefined): TimeframeStatus {
  if (ageMinutes == null || Number.isNaN(ageMinutes)) return "missing";
  const threshold = THRESHOLDS_MINUTES[timeframe] ?? 24 * 60;
  return ageMinutes > threshold ? "stale" : "ok";
}

export function deriveProfileCoverage(statusByTf: Record<string, TimeframeStatus>) {
  const swing = statusByTf["1D"] && statusByTf["1D"] !== "missing";
  const position = statusByTf["1W"] && statusByTf["1W"] !== "missing";
  const intradayOk =
    (statusByTf["1H"] === "ok" || statusByTf["4H"] === "ok" || statusByTf["15m"] === "ok") &&
    !["missing"].includes(statusByTf["1H"] ?? "missing") &&
    !["missing"].includes(statusByTf["4H"] ?? "missing");
  return {
    swing,
    position,
    intraday: intradayOk,
  };
}

export type CoverageRow = {
  assetId: string;
  symbol: string;
  displayName: string;
  provider?: string | null;
  timeframes: Record<
    string,
    {
      lastTimestamp?: string | null;
      ageMinutes: number | null;
      status: TimeframeStatus;
      source?: string | null;
    }
  >;
  profiles: ReturnType<typeof deriveProfileCoverage>;
};
