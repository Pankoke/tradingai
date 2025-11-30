import { getCandlesForAsset } from "@/src/server/repositories/candleRepository";
import { upsertBiasSnapshot } from "@/src/server/repositories/biasRepository";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import type { Timeframe } from "@/src/server/providers/marketDataProvider";

const MIN_CANDLES = 5;
const DEFAULT_LOOKBACK = 20;

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function computeTechnicalBiasForAsset(params: {
  assetId: string;
  date: Date;
  timeframe?: Timeframe;
  lookbackDays?: number;
}): Promise<boolean> {
  const timeframe = params.timeframe ?? "1D";
  const lookback = params.lookbackDays ?? DEFAULT_LOOKBACK;

  const toDate = params.date;
  const fromDate = new Date(params.date);
  fromDate.setDate(fromDate.getDate() - lookback);

  const candles = await getCandlesForAsset({
    assetId: params.assetId,
    timeframe,
    from: fromDate,
    to: toDate,
  });

  if (candles.length < MIN_CANDLES) {
    return false;
  }

  const sorted = [...candles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const firstClose = Number(sorted[0].close);
  const lastClose = Number(sorted[sorted.length - 1].close);

  if (firstClose === 0) {
    return false;
  }

  const priceChangePct = ((lastClose - firstClose) / firstClose) * 100;

  const averageRangePct =
    sorted.reduce((sum, candle) => {
      const high = Number(candle.high);
      const low = Number(candle.low);
      const close = Number(candle.close);
      if (close === 0) {
        return sum;
      }
      return sum + ((high - low) / close) * 100;
    }, 0) / sorted.length;

  const clampedChange = clamp(priceChangePct, -10, 10);
  const biasScore = Math.round((clampedChange / 10) * 100);
  const trendScore = biasScore;

  const volClamped = clamp(averageRangePct, 0, 5);
  const volatilityScore = Math.round((volClamped / 5) * 100);
  const rangeScore = clamp(100 - volatilityScore, 0, 100);

  let confidence = 50;
  if (Math.abs(biasScore) > 40) confidence += 10;
  if (lookback >= DEFAULT_LOOKBACK && candles.length > 15) confidence += 10;

  confidence = clamp(confidence, 0, 100);

  await upsertBiasSnapshot({
    assetId: params.assetId,
    id: `${params.assetId}-${toDateOnlyString(toDate)}-${timeframe}`,
    date: toDateOnlyString(toDate),
    timeframe,
    biasScore,
    confidence,
    trendScore,
    volatilityScore,
    rangeScore,
    meta: null,
  });

  return true;
}

export async function computeTechnicalBiasForAllActiveAssets(params: {
  date: Date;
  timeframe?: Timeframe;
  lookbackDays?: number;
}): Promise<{ processed: number; skipped: number }> {
  const assets = await getActiveAssets();
  let processed = 0;
  let skipped = 0;

  for (const asset of assets) {
    const success = await computeTechnicalBiasForAsset({
      assetId: asset.id,
      date: params.date,
      timeframe: params.timeframe,
      lookbackDays: params.lookbackDays,
    });

    if (success) {
      processed += 1;
    } else {
      skipped += 1;
    }
  }

  return { processed, skipped };
}
