import { NextResponse, type NextRequest } from "next/server";
import { getAssetBySymbol } from "@/src/server/repositories/assetRepository";
import { getTimeframesForAsset } from "@/src/server/marketData/timeframeConfig";
import {
  buildOrderflowMetrics,
  ORDERFLOW_TIMEFRAMES,
  type MarketTimeframe,
} from "@/src/lib/engine/orderflowMetrics";
import { applyOrderflowConfidenceAdjustment } from "@/src/lib/engine/orderflowAdjustments";
import type { ConfidenceAdjustmentResult } from "@/src/lib/engine/sentimentAdjustments";
import { buildMarketMetrics } from "@/src/lib/engine/marketMetrics";
import { getCandlesForAsset, getRecentCandlesForAsset } from "@/src/server/repositories/candleRepository";
import { DbBiasProvider } from "@/src/server/providers/biasProvider";
import type { Timeframe } from "@/src/server/providers/marketDataProvider";

type CandleLike = {
  timestamp: Date;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume?: number | string | null;
};

const CANDLE_LOOKBACK_COUNT: Record<MarketTimeframe, number> = {
  "1D": 120,
  "1W": 120,
  "4H": 90,
  "1H": 72,
  "15m": 60,
};

function timeframeToMs(timeframe: MarketTimeframe): number {
  switch (timeframe) {
    case "1W":
      return 7 * 24 * 60 * 60 * 1000;
    case "1D":
      return 24 * 60 * 60 * 1000;
    case "4H":
      return 4 * 60 * 60 * 1000;
    case "1H":
      return 60 * 60 * 1000;
    case "15m":
    default:
      return 15 * 60 * 1000;
  }
}

function normalizeTimeframe(tf: string): MarketTimeframe | null {
  const upper = tf.toUpperCase();
  if (upper === "1D" || upper === "1H" || upper === "4H" || upper === "1W") return upper as MarketTimeframe;
  if (upper === "15M") return "15m";
  return null;
}

async function loadCandlesByTimeframe(params: {
  assetId: string;
  timeframes: MarketTimeframe[];
  asOf: Date;
}): Promise<Record<MarketTimeframe, CandleLike[]>> {
  const result: Partial<Record<MarketTimeframe, CandleLike[]>> = {};
  await Promise.all(
    params.timeframes.map(async (tf) => {
      const durationMs = timeframeToMs(tf) * (CANDLE_LOOKBACK_COUNT[tf] ?? 60);
      const from = new Date(params.asOf.getTime() - durationMs);
      const rows = await getCandlesForAsset({ assetId: params.assetId, timeframe: tf, from, to: params.asOf });
      result[tf] = rows;
    }),
  );
  return result as Record<MarketTimeframe, CandleLike[]>;
}

async function resolveReferencePrice(assetId: string): Promise<number> {
  const [latest] = await getRecentCandlesForAsset({
    assetId,
    timeframe: "1D",
    limit: 1,
  });
  return latest ? Number(latest.close) : 0;
}

function normalizeBiasScore(raw?: number | null): number | undefined {
  if (typeof raw !== "number") {
    return undefined;
  }
  const normalized = (raw + 100) / 2;
  const clamped = Math.max(0, Math.min(100, Math.round(normalized)));
  return clamped;
}

const BIAS_TIMEFRAME: Timeframe = "1D";

export async function GET(request: NextRequest) {
  const symbolParam = request.nextUrl.searchParams.get("symbol");
  if (!symbolParam) {
    return NextResponse.json(
      { ok: false, error: "Query parameter 'symbol' is required" },
      { status: 400 },
    );
  }

  const normalizedSymbol = symbolParam.trim();
  const asset =
    (await getAssetBySymbol(normalizedSymbol)) ??
    (await getAssetBySymbol(normalizedSymbol.toUpperCase())) ??
    (await getAssetBySymbol(normalizedSymbol.toLowerCase()));

  if (!asset) {
    return NextResponse.json(
      { ok: false, error: `No asset found for symbol ${normalizedSymbol}` },
      { status: 404 },
    );
  }

  const configured = getTimeframesForAsset(asset);
  const supported = configured
    .map(normalizeTimeframe)
    .filter((tf): tf is MarketTimeframe => Boolean(tf) && ORDERFLOW_TIMEFRAMES.includes(tf as MarketTimeframe));
  const timeframes = supported.length > 0 ? supported : ORDERFLOW_TIMEFRAMES;
  const asOf = new Date();
  const candlesByTimeframe = await loadCandlesByTimeframe({ assetId: asset.id, timeframes, asOf });

  const referencePrice = await resolveReferencePrice(asset.id);
  const marketMetrics = await buildMarketMetrics({
    referencePrice,
    timeframes,
    candlesByTimeframe,
    now: asOf,
  });

  const biasProvider = new DbBiasProvider();
  const biasSnapshot = await biasProvider.getBiasSnapshot({
    assetId: asset.id,
    date: new Date(),
    timeframe: BIAS_TIMEFRAME,
  });
  const normalizedBias = normalizeBiasScore(biasSnapshot?.biasScore);

  const metrics = await buildOrderflowMetrics({
    candlesByTimeframe,
    timeframes,
    trendScore: marketMetrics.trendScore,
    biasScore: normalizedBias ?? null,
    assetClass: asset.assetClass ?? null,
  });

  const baseConfidence = 50;
  const orderflowAdjustment: ConfidenceAdjustmentResult = applyOrderflowConfidenceAdjustment({
    base: baseConfidence,
    orderflow: metrics,
  });

  return NextResponse.json({
    ok: true,
    asset: {
      id: asset.id,
      symbol: asset.symbol,
      assetClass: asset.assetClass ?? null,
    },
    requestedTimeframes: timeframes,
    metrics,
    orderflowFlags: metrics.flags ?? [],
    orderflowConfidenceDelta: orderflowAdjustment.delta,
    metaContext: metrics.meta,
    profile: metrics.meta?.profile ?? "default",
    context: metrics.meta?.context ?? null,
  });
}
