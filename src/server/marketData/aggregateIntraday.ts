import { getCandlesForAsset, upsertCandles } from "@/src/server/repositories/candleRepository";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";

type DeriveParams = {
  assetId: string;
  from?: Date;
  to?: Date;
  sourceLabel?: string;
};

type DeriveResult = {
  inserted: number;
  buckets: number;
};

function bucketStart(timestamp: Date): Date {
  const year = timestamp.getUTCFullYear();
  const month = timestamp.getUTCMonth();
  const day = timestamp.getUTCDate();
  const hour = timestamp.getUTCHours();
  const bucketHour = Math.floor(hour / 4) * 4;
  return new Date(Date.UTC(year, month, day, bucketHour, 0, 0, 0));
}

function timeframeToMs(tf: MarketTimeframe): number {
  if (tf === "1H") return 60 * 60 * 1000;
  if (tf === "4H") return 4 * 60 * 60 * 1000;
  if (tf === "15m") return 15 * 60 * 1000;
  if (tf === "1W") return 7 * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

export async function derive4hFrom1hCandles(params: DeriveParams): Promise<DeriveResult> {
  const to = params.to ?? new Date();
  const from = params.from ?? new Date(to.getTime() - timeframeToMs("1H") * 24 * 2); // default ~2 Tage
  const sourceLabel = params.sourceLabel ?? "derived";

  const oneHourCandles = await getCandlesForAsset({
    assetId: params.assetId,
    timeframe: "1H",
    from,
    to,
  });

  if (!oneHourCandles.length) {
    return { inserted: 0, buckets: 0 };
  }

  const buckets = new Map<number, typeof oneHourCandles>();

  for (const candle of oneHourCandles) {
    const ts = candle.timestamp instanceof Date ? candle.timestamp : new Date(candle.timestamp);
    const bucket = bucketStart(ts).getTime();
    const list = buckets.get(bucket);
    if (list) {
      list.push(candle);
    } else {
      buckets.set(bucket, [candle]);
    }
  }

  const inserts = [];
  for (const [bucketTs, candles] of buckets.entries()) {
    if (!candles.length) continue;
    const sorted = [...candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const open = Number(sorted[0].open);
    const close = Number(sorted[sorted.length - 1].close);
    const high = Math.max(...candles.map((c) => Number(c.high)));
    const low = Math.min(...candles.map((c) => Number(c.low)));
    const volume = candles.reduce((sum, c) => sum + Number(c.volume ?? 0), 0);

    inserts.push({
      assetId: params.assetId,
      timeframe: "4H" as const,
      timestamp: new Date(bucketTs),
      open: String(open),
      high: String(high),
      low: String(low),
      close: String(close),
      volume: Number.isFinite(volume) ? String(volume) : undefined,
      source: sourceLabel,
    });
  }

  if (!inserts.length) {
    return { inserted: 0, buckets: 0 };
  }

  await upsertCandles(inserts);
  return { inserted: inserts.length, buckets: buckets.size };
}
