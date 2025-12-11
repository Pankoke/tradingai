import type { Asset } from "@/src/server/repositories/assetRepository";
import { upsertCandles } from "@/src/server/repositories/candleRepository";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import { resolveMarketDataProvider } from "@/src/server/marketData/providerResolver";
import { YahooMarketDataProvider } from "@/src/server/providers/yahooMarketDataProvider";
import { getTimeframesForAsset } from "@/src/server/marketData/timeframeConfig";

const MAX_YEARS = 5;

export async function syncDailyCandlesForAsset(params: {
  asset: Asset;
  from: Date;
  to: Date;
  timeframe?: MarketTimeframe;
}): Promise<void> {
  if (params.from > params.to) {
    throw new Error("`from` must be before `to`");
  }

  const yearsDiff = (params.to.getTime() - params.from.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (yearsDiff > MAX_YEARS) {
    throw new Error("Requested range exceeds maximum window");
  }

  const targetTimeframes: MarketTimeframe[] =
    params.timeframe != null ? [params.timeframe] : getTimeframesForAsset(params.asset);
  let totalInserted = 0;

  for (const timeframe of targetTimeframes) {
    const provider = resolveMarketDataProvider(params.asset);
    let candles = await provider.fetchCandles({
      asset: params.asset,
      timeframe,
      from: params.from,
      to: params.to,
    });

    if (!candles.length && provider.provider !== "yahoo" && timeframe === "1D") {
      const fallback = new YahooMarketDataProvider();
      const yahooCandles = await fallback.fetchCandles({
        asset: params.asset,
        timeframe,
        from: params.from,
        to: params.to,
      });
      if (yahooCandles.length) {
        console.warn(
          `[syncDailyCandlesForAsset] provider ${provider.provider} returned no data for ${params.asset.symbol} (${timeframe}), falling back to Yahoo`,
        );
        candles = yahooCandles;
      }
    }

    if (!candles.length) {
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
    totalInserted += inserts.length;
  }

  console.log(
    `synced ${totalInserted} candles for ${params.asset.symbol} across ${targetTimeframes.length} timeframe(s)`,
  );
}
