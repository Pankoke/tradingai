import { NextResponse, type NextRequest } from "next/server";
import { getAssetBySymbol } from "@/src/server/repositories/assetRepository";
import { getTimeframesForAsset } from "@/src/server/marketData/timeframeConfig";
import {
  buildOrderflowMetrics,
  ORDERFLOW_TIMEFRAMES,
} from "@/src/lib/engine/orderflowMetrics";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import { applyOrderflowConfidenceAdjustment } from "@/src/lib/engine/orderflowAdjustments";
import type { ConfidenceAdjustmentResult } from "@/src/lib/engine/sentimentAdjustments";
import { buildMarketMetrics } from "@/src/lib/engine/marketMetrics";
import { getRecentCandlesForAsset } from "@/src/server/repositories/candleRepository";
import { DbBiasProvider } from "@/src/server/providers/biasProvider";
import type { Timeframe } from "@/src/server/providers/marketDataProvider";

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
  const supported = configured.filter((tf): tf is MarketTimeframe =>
    ORDERFLOW_TIMEFRAMES.includes(tf as MarketTimeframe),
  );
  const timeframes = supported.length > 0 ? supported : ORDERFLOW_TIMEFRAMES;

  const referencePrice = await resolveReferencePrice(asset.id);
  const marketMetrics = await buildMarketMetrics({
    asset,
    referencePrice,
    timeframes: getTimeframesForAsset(asset),
  });

  const biasProvider = new DbBiasProvider();
  const biasSnapshot = await biasProvider.getBiasSnapshot({
    assetId: asset.id,
    date: new Date(),
    timeframe: BIAS_TIMEFRAME,
  });
  const normalizedBias = normalizeBiasScore(biasSnapshot?.biasScore);

  const metrics = await buildOrderflowMetrics({
    asset,
    timeframes,
    trendScore: marketMetrics.trendScore,
    biasScore: normalizedBias ?? null,
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
