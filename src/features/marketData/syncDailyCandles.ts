import { YahooMarketDataProvider } from "@/src/server/providers/yahooMarketDataProvider";
import { getAssetById } from "@/src/server/repositories/assetRepository";
import { upsertCandles } from "@/src/server/repositories/candleRepository";
import type { Timeframe } from "@/src/server/providers/marketDataProvider";

const MAX_YEARS = 5;

export async function syncDailyCandlesForAsset(params: {
  assetId: string;
  symbol: string;
  from: Date;
  to: Date;
}): Promise<void> {
  if (params.from > params.to) {
    throw new Error("`from` must be before `to`");
  }

  const yearsDiff = (params.to.getTime() - params.from.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (yearsDiff > MAX_YEARS) {
    throw new Error("Requested range exceeds maximum window");
  }

  const asset = await getAssetById(params.assetId);
  if (!asset) {
    throw new Error(`Asset ${params.assetId} not found`);
  }

  const provider = new YahooMarketDataProvider();
  const candles = await provider.getCandles({
    assetId: params.assetId,
    symbol: params.symbol,
    timeframe: "1D" as Timeframe,
    from: params.from,
    to: params.to,
  });

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
  console.log(`synced ${inserts.length} candles for ${asset.symbol}`);
}
