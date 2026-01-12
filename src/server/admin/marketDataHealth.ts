import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import {
  getAssetCandleStats,
  getProviderCandleStats,
} from "@/src/server/repositories/candleRepository";
import type { MarketDataSource, MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";

export type MarketDataStatus = "fresh" | "stale" | "critical";

type ProviderTimeframeConfig = {
  provider: MarketDataSource;
  timeframe: MarketTimeframe;
  freshMs: number;
  staleMs: number;
};

type ProviderSummary = {
  provider: MarketDataSource;
  timeframe: MarketTimeframe;
  lastCandleAt: Date | null;
  delayMs: number | null;
  status: MarketDataStatus;
};

export type StaleAssetEntry = {
  assetId: string;
  symbol: string;
  assetClass: string;
  provider: MarketDataSource;
  timeframe: MarketTimeframe;
  lastCandleAt: Date | null;
  delayMs: number | null;
  status: MarketDataStatus;
};

export type MarketDataHealth = {
  overallStatus: MarketDataStatus;
  providerSummaries: ProviderSummary[];
  staleAssets: StaleAssetEntry[];
};

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

const PROVIDER_CONFIGS: ProviderTimeframeConfig[] = [
  { provider: "yahoo", timeframe: "1D", freshMs: 3 * MS_DAY, staleMs: 7 * MS_DAY },
  { provider: "twelvedata", timeframe: "1H", freshMs: 3 * MS_HOUR, staleMs: 12 * MS_HOUR },
  { provider: "finnhub", timeframe: "1H", freshMs: 3 * MS_HOUR, staleMs: 12 * MS_HOUR },
  { provider: "derived", timeframe: "4H", freshMs: 8 * MS_HOUR, staleMs: 24 * MS_HOUR },
];

const STATUS_WEIGHT: Record<MarketDataStatus, number> = {
  fresh: 0,
  stale: 1,
  critical: 2,
};

const STATUS_FALLBACK: ProviderSummary = {
  provider: "yahoo",
  timeframe: "1D",
  status: "critical",
  delayMs: null,
  lastCandleAt: null,
};

function evaluateStatus(
  timestamp: Date | null,
  config: ProviderTimeframeConfig,
): Omit<ProviderSummary, "provider" | "timeframe"> {
  if (!timestamp) {
    return { lastCandleAt: null, delayMs: null, status: "critical" };
  }
  const delayMs = Date.now() - timestamp.getTime();
  if (delayMs <= config.freshMs) {
    return { lastCandleAt: timestamp, delayMs, status: "fresh" };
  }
  if (delayMs <= config.staleMs) {
    return { lastCandleAt: timestamp, delayMs, status: "stale" };
  }
  return { lastCandleAt: timestamp, delayMs, status: "critical" };
}

function pickWorst<T extends { status: MarketDataStatus; delayMs: number | null }>(entries: T[]): T | null {
  if (!entries.length) return null;
  return entries.reduce((worst, current) => {
    const weightCurrent = STATUS_WEIGHT[current.status];
    const weightWorst = STATUS_WEIGHT[worst.status];
    if (weightCurrent > weightWorst) {
      return current;
    }
    if (weightCurrent === weightWorst) {
      const delayCurrent = current.delayMs ?? Number.POSITIVE_INFINITY;
      const delayWorst = worst.delayMs ?? Number.POSITIVE_INFINITY;
      return delayCurrent > delayWorst ? current : worst;
    }
    return worst;
  });
}

export async function getMarketDataHealth(): Promise<MarketDataHealth> {
  const uniqueSources = Array.from(new Set(PROVIDER_CONFIGS.map((config) => config.provider)));
  const uniqueTimeframes = Array.from(new Set(PROVIDER_CONFIGS.map((config) => config.timeframe)));

  const [providerStats, assetStats, assets] = await Promise.all([
    getProviderCandleStats({ sources: uniqueSources, timeframes: uniqueTimeframes }),
    getAssetCandleStats({ sources: uniqueSources, timeframes: uniqueTimeframes }),
    getActiveAssets(),
  ]);

  const providerStatMap = new Map<string, Date | null>();
  providerStats.forEach((row) => {
    providerStatMap.set(`${row.source}-${row.timeframe}`, row.lastTimestamp);
  });

  const providerSummaries: ProviderSummary[] = PROVIDER_CONFIGS.map((config) => {
    const key = `${config.provider}-${config.timeframe}`;
    const timestamp = providerStatMap.get(key) ?? null;
    const statusData = evaluateStatus(timestamp, config);
    return {
      provider: config.provider,
      timeframe: config.timeframe,
      ...statusData,
    };
  });

  const overallStatus = providerSummaries.reduce((result, summary) => {
    const currentWeight = STATUS_WEIGHT[summary.status];
    const resultWeight = STATUS_WEIGHT[result.status];
    return currentWeight > resultWeight ? summary : result;
  }, providerSummaries[0] ?? STATUS_FALLBACK).status;

  const assetStatMap = new Map<string, Date | null>();
  assetStats.forEach((row) => {
    assetStatMap.set(`${row.assetId}-${row.source}-${row.timeframe}`, row.lastTimestamp);
  });

  const staleCandidates: StaleAssetEntry[] = assets.map((asset) => {
    const summaries = PROVIDER_CONFIGS.map((config) => {
      const key = `${asset.id}-${config.provider}-${config.timeframe}`;
      const timestamp = assetStatMap.get(key) ?? null;
      const statusData = evaluateStatus(timestamp, config);
      return {
        assetId: asset.id,
        symbol: asset.symbol,
        assetClass: asset.assetClass,
        provider: config.provider,
        timeframe: config.timeframe,
        ...statusData,
      };
    });
    const fallbackConfig = PROVIDER_CONFIGS[0];
    return (
      pickWorst(summaries) ?? {
        assetId: asset.id,
        symbol: asset.symbol,
        assetClass: asset.assetClass,
        provider: fallbackConfig.provider,
        timeframe: fallbackConfig.timeframe,
        lastCandleAt: null,
        delayMs: null,
        status: "critical",
      }
    );
  });

  const staleAssets = staleCandidates
    .filter((entry) => entry.status !== "fresh")
    .sort((a, b) => {
      const weightDiff = STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];
      if (weightDiff !== 0) {
        return weightDiff;
      }
      const delayA = a.delayMs ?? Number.POSITIVE_INFINITY;
      const delayB = b.delayMs ?? Number.POSITIVE_INFINITY;
      return delayB - delayA;
    })
    .slice(0, 5);

  return {
    overallStatus,
    providerSummaries,
    staleAssets,
  };
}
