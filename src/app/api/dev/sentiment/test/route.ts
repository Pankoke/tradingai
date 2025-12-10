import { NextResponse } from "next/server";
import {
  getAssetBySymbol,
  getActiveAssets,
  type Asset,
} from "@/src/server/repositories/assetRepository";
import { resolveSentimentProvider } from "@/src/server/sentiment/providerResolver";
import { buildSentimentMetrics } from "@/src/lib/engine/sentimentMetrics";
import { getTimeframesForAsset } from "@/src/server/marketData/timeframeConfig";
import { buildMarketMetrics } from "@/src/lib/engine/marketMetrics";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import { computeLevelsForSetup, type SetupLevelCategory } from "@/src/lib/engine/levels";
import { DbBiasProvider } from "@/src/server/providers/biasProvider";
import type { Timeframe } from "@/src/server/providers/marketDataProvider";
import { getLatestCandleForAsset } from "@/src/server/repositories/candleRepository";
import type { SentimentContext } from "@/src/server/sentiment/SentimentProvider";
import {
  applySentimentConfidenceAdjustment,
  computeSentimentRankingAdjustment,
} from "@/src/lib/engine/sentimentAdjustments";
import { deriveBaseConfidenceScore } from "@/src/lib/engine/confidence";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbolParam = url.searchParams.get("symbol") ?? "BTCUSDT";

  let asset = await getAssetBySymbol(symbolParam);
  if (!asset) {
    const all = await getActiveAssets();
    asset = all.find((entry) => entry.symbol.toUpperCase() === symbolParam.toUpperCase());
  }

  if (!asset) {
    return NextResponse.json(
      { ok: false, error: `Asset ${symbolParam} not found` },
      { status: 404 },
    );
  }

  const provider = resolveSentimentProvider(asset);
  if (!provider) {
    return NextResponse.json(
      {
        ok: false,
        error: "No sentiment provider configured for this asset",
        asset: asset.symbol,
      },
      { status: 400 },
    );
  }

  const {
    context: sentimentContext,
    metrics: marketMetrics,
    baseConfidence,
  } = await buildContextForAsset(asset);
  const raw = await provider.fetchSentiment({ asset, context: sentimentContext });
  const debug = provider.getLastDebug ? provider.getLastDebug() : null;

  if (!raw) {
    return NextResponse.json(
      {
        ok: false,
        provider: provider.source,
        error: debug?.message ?? "Provider did not return data",
        details: {
          ...debug,
        },
      },
      { status: 502 },
    );
  }

  const sentimentMetrics = buildSentimentMetrics({ asset, sentiment: raw });
  const confidenceAdjustment = applySentimentConfidenceAdjustment({
    base: baseConfidence,
    sentiment: sentimentMetrics,
  });
  const rankingAdjustment = computeSentimentRankingAdjustment(sentimentMetrics);
  const normalizedInputs = {
    usedBias: sentimentContext.biasScore ?? null,
    usedTrend: sentimentContext.trendScore ?? null,
    usedMomentum: sentimentContext.momentumScore ?? null,
    usedEvent: sentimentContext.eventScore ?? null,
    usedOrderflow: sentimentContext.orderflowScore ?? null,
    usedRrr: sentimentContext.rrr ?? null,
    usedRiskPercent: sentimentContext.riskPercent ?? null,
    usedVolatilityLabel: sentimentContext.volatilityLabel ?? null,
  };

  return NextResponse.json({
    ok: true,
    symbol: asset.symbol,
    provider: provider.source,
    label: sentimentMetrics.label,
    reasonsPreview: sentimentMetrics.reasons.slice(0, 3),
    sentiment: sentimentMetrics,
    raw,
    inputs: normalizedInputs,
    contributions: sentimentMetrics.contributions ?? [],
    flags: sentimentMetrics.flags ?? [],
    dominantDrivers: sentimentMetrics.dominantDrivers ?? [],
    confidenceAdjustment: confidenceAdjustment.delta,
    rankingAdjustment: rankingAdjustment.delta,
    rankingAdjustmentHint: rankingAdjustment.hint,
    debug: {
      ...debug,
      context: sentimentContext,
      marketMetrics,
      baseConfidence,
    },
  });
}

const biasProvider = new DbBiasProvider();
const DEFAULT_TIMEFRAME: MarketTimeframe = "1D";

async function buildContextForAsset(asset: Asset): Promise<{
  context: SentimentContext;
  metrics: Awaited<ReturnType<typeof buildMarketMetrics>>;
  baseConfidence: number;
}> {
  const timeframe = DEFAULT_TIMEFRAME;
  const candle = await getLatestCandleForAsset({
    assetId: asset.id,
    timeframe,
  });
  const referencePrice = candle ? Number(candle.close) : 0;
  const metrics = await buildMarketMetrics({
    asset,
    referencePrice,
    timeframes: getTimeframesForAsset(asset),
  });

  const levels = computeLevelsForSetup({
    direction: "long",
    referencePrice,
    volatilityScore: metrics.volatilityScore,
    category: "unknown" as SetupLevelCategory,
  });

  const biasSnapshot = await biasProvider.getBiasSnapshot({
    assetId: asset.id,
    date: new Date(),
    timeframe: timeframe as Timeframe,
  });

  const context: SentimentContext = {
    biasScore: normalizeBiasScore(biasSnapshot?.biasScore),
    trendScore: metrics.trendScore,
    momentumScore: metrics.momentumScore,
    orderflowScore: metrics.momentumScore,
    eventScore: 50,
    rrr: levels.riskReward.rrr ?? undefined,
    riskPercent: levels.riskReward.riskPercent ?? undefined,
    volatilityLabel: mapVolatilityLabel(metrics.volatilityScore),
    driftPct: metrics.priceDriftPct,
  };
  return {
    context,
    metrics,
    baseConfidence: deriveBaseConfidenceScore(metrics),
  };
}

function normalizeBiasScore(value?: number | null): number | undefined {
  if (typeof value !== "number") return undefined;
  return clampScore((value + 100) / 2);
}

function mapVolatilityLabel(score: number): string {
  if (score < 35) return "low";
  if (score < 65) return "medium";
  return "high";
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
