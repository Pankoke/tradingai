import type { Asset } from "@/src/server/repositories/assetRepository";
import { upsertCandles } from "@/src/server/repositories/candleRepository";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import { resolveMarketDataProviders } from "@/src/server/marketData/providerResolver";
import { YahooMarketDataProvider } from "@/src/server/providers/yahooMarketDataProvider";
import { getTimeframesForAsset } from "@/src/server/marketData/timeframeConfig";
import type { CandleDomainModel } from "@/src/server/providers/marketDataProvider";
import { FinnhubRateLimitError } from "@/src/server/marketData/finnhubMarketDataProvider";

const MAX_YEARS = 5;

type SyncResult = {
  timeframe: MarketTimeframe;
  inserted: number;
  provider: string;
  fallbackUsed?: boolean;
  rateLimited?: boolean;
};

export async function syncDailyCandlesForAsset(params: {
  asset: Asset;
  from: Date;
  to: Date;
  timeframe?: MarketTimeframe;
}): Promise<SyncResult[]> {
  if (params.from > params.to) {
    throw new Error("`from` must be before `to`");
  }

  const yearsDiff = (params.to.getTime() - params.from.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (yearsDiff > MAX_YEARS) {
    throw new Error("Requested range exceeds maximum window");
  }

  const targetTimeframes: MarketTimeframe[] =
    params.timeframe != null ? [params.timeframe] : getTimeframesForAsset(params.asset);
  const results: SyncResult[] = [];

  for (const timeframe of targetTimeframes) {
    const { primary, fallback } = resolveMarketDataProviders({ asset: params.asset, timeframe });
    let candles: CandleDomainModel[] = [];
    let providerUsed: string = primary.provider;
    let fallbackUsed = false;
    let rateLimited = false;

    const fetchFrom = async (provider: typeof primary, tf: MarketTimeframe) => {
      if (tf === "1W") {
        const daily = await provider.fetchCandles({
          asset: params.asset,
          timeframe: "1D",
          from: params.from,
          to: params.to,
        });
        return aggregateWeeklyFromDaily(daily);
      }
      return provider.fetchCandles({
        asset: params.asset,
        timeframe: tf,
        from: params.from,
        to: params.to,
      });
    };

    try {
      candles = await fetchFrom(primary, timeframe);
    } catch (error) {
      if (error instanceof FinnhubRateLimitError) {
        rateLimited = true;
      } else {
        throw error;
      }
    }

    if (!candles.length && fallback) {
      try {
        const fallbackCandles = await fetchFrom(fallback, timeframe);
        if (fallbackCandles.length) {
          console.warn(
            `[syncDailyCandlesForAsset] primary ${primary.provider} returned no data for ${params.asset.symbol} (${timeframe}), falling back to ${fallback.provider}`,
          );
          candles = fallbackCandles;
          providerUsed = fallback.provider;
          fallbackUsed = true;
        }
      } catch (error) {
        if (error instanceof FinnhubRateLimitError) {
          rateLimited = true;
        } else {
          throw error;
        }
      }
    }

    if (!candles.length) {
      results.push({ timeframe, inserted: 0, provider: providerUsed, fallbackUsed, rateLimited });
      continue;
    }

    const inserts = candles.map((item) => ({
      assetId: item.assetId,
      timeframe: item.timeframe,
      timestamp: item.timestamp,
      open: String(item.open),
      high: String(item.high),
      low: String(item.low),
      close: String(item.close),
      volume: item.volume !== undefined ? String(item.volume) : undefined,
      source: item.source,
    }));

    await upsertCandles(inserts);
    const inserted = inserts.length;
    results.push({ timeframe, inserted, provider: providerUsed, fallbackUsed, rateLimited });
  }

  console.log(
    `synced ${results.reduce((sum, r) => sum + r.inserted, 0)} candles for ${params.asset.symbol} across ${targetTimeframes.length} timeframe(s)`,
  );
  return results;
}

/**
 * Aggregate ISO-week candles from daily data.
 * - Bucket key: ISO week start (Mon 00:00 UTC), stored as timestamp on the weekly candle.
 * - Open/Close: first/last daily candle in the bucket (sorted by timestamp).
 * - High/Low: extrema across the bucket; Volume: sum.
 * - Partial weeks (current week) are emitted and will be upserted on re-sync for stability.
 */
export function aggregateWeeklyFromDaily(daily: CandleDomainModel[]): CandleDomainModel[] {
  if (!daily.length) return [];
  const sorted = [...daily].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const buckets = new Map<number, CandleDomainModel[]>();

  for (const candle of sorted) {
    const weekStart = startOfIsoWeek(candle.timestamp).getTime();
    const group = buckets.get(weekStart);
    if (group) group.push(candle);
    else buckets.set(weekStart, [candle]);
  }

  const weekly: CandleDomainModel[] = [];
  for (const [weekTs, candlesOfWeek] of buckets.entries()) {
    if (!candlesOfWeek.length) continue;
    const open = Number(candlesOfWeek[0].open);
    const close = Number(candlesOfWeek[candlesOfWeek.length - 1].close);
    const high = Math.max(...candlesOfWeek.map((c) => Number(c.high)));
    const low = Math.min(...candlesOfWeek.map((c) => Number(c.low)));
    const volume = candlesOfWeek.reduce((sum, c) => sum + Number(c.volume ?? 0), 0);
    weekly.push({
      assetId: candlesOfWeek[0].assetId,
      timeframe: "1W",
      timestamp: new Date(weekTs),
      open,
      high,
      low,
      close,
      volume,
      source: candlesOfWeek[0].source,
    });
  }
  return weekly;
}

function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Sunday -> 7
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
