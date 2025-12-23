import type { Setup, VolatilityLabel } from "./types";
import type { BiasSnapshot, Event } from "./eventsBiasTypes";
import { mockSetups } from "@/src/lib/mockSetups";
import { mockEvents } from "@/src/lib/mockEvents";
import { mockBiasSnapshot } from "@/src/lib/mockBias";
import { setupDefinitions, type SetupDefinition } from "@/src/lib/engine/setupDefinitions";
import { computeLevelsForSetup, type SetupLevelCategory } from "@/src/lib/engine/levels";
import { syncDailyCandlesForAsset } from "@/src/features/marketData/syncDailyCandles";
import { getActiveAssets, type Asset } from "@/src/server/repositories/assetRepository";
import { getEventsInRange } from "@/src/server/repositories/eventRepository";
import { DbBiasProvider, type BiasDomainModel } from "@/src/server/providers/biasProvider";
import { getLatestCandleForAsset } from "@/src/server/repositories/candleRepository";
import type { Timeframe } from "@/src/server/providers/marketDataProvider";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import { getTimeframesForAsset, TIMEFRAME_SYNC_WINDOWS } from "@/src/server/marketData/timeframeConfig";
import { buildMarketMetrics } from "@/src/lib/engine/marketMetrics";
import type { MarketMetrics } from "@/src/lib/engine/marketMetrics";
import {
  buildOrderflowMetrics,
  type OrderflowMode,
} from "@/src/lib/engine/orderflowMetrics";
import { getPerceptionDataMode } from "@/src/lib/config/perceptionDataMode";
import { resolveSentimentProvider } from "@/src/server/sentiment/providerResolver";
import type {
  SentimentContext,
  SentimentRawSnapshot,
} from "@/src/server/sentiment/SentimentProvider";
import { buildSentimentMetrics, type SentimentMetrics } from "@/src/lib/engine/sentimentMetrics";
import {
  applySentimentConfidenceAdjustment,
  type ConfidenceAdjustmentResult,
} from "@/src/lib/engine/sentimentAdjustments";
import { deriveBaseConfidenceScore } from "@/src/lib/engine/confidence";
import { createDefaultRings } from "@/src/lib/engine/rings";
import { applyOrderflowConfidenceAdjustment } from "@/src/lib/engine/orderflowAdjustments";
import { getSetupProfileConfig, type SetupProfile } from "@/src/lib/config/setupProfile";

export interface PerceptionDataSource {
  getSetupsForToday(params: { asOf: Date }): Promise<Setup[]>;
  getEventsForWindow(params: { from: Date; to: Date }): Promise<Event[]>;
  getBiasSnapshotForAssets(params: {
    assets: { assetId?: string | null; symbol: string; timeframe?: string }[];
    date: Date;
  }): Promise<BiasSnapshot>;
}

const EVENT_CATEGORIES = ["macro", "crypto", "onchain", "technical", "other"] as const;
type EventCategory = (typeof EVENT_CATEGORIES)[number];

function mapCategory(value: string): EventCategory {
  if (EVENT_CATEGORIES.includes(value as EventCategory)) {
    return value as EventCategory;
  }
  return "other";
}

const TEMPLATE_LEVEL_CATEGORY: Record<SetupDefinition["id"], SetupLevelCategory> = {
  trend_breakout: "breakout",
  trend_pullback: "pullback",
  mean_reversion_overshoot: "range",
  range_compression: "range",
  momentum_strong: "trendContinuation",
};

function resolveLevelCategory(definition?: SetupDefinition): SetupLevelCategory {
  if (!definition) {
    return "unknown";
  }
  return TEMPLATE_LEVEL_CATEGORY[definition.id] ?? "unknown";
}

const MARKETDATA_SYNC_WINDOW_DAYS = 30;

class MockPerceptionDataSource implements PerceptionDataSource {
  async getSetupsForToday(): Promise<Setup[]> {
    return mockSetups;
  }

  async getEventsForWindow(params: { from: Date; to: Date }): Promise<Event[]> {
    const fromTime = params.from.getTime();
    const toTime = params.to.getTime();

    return mockEvents.filter((event) => {
      const start = new Date(event.startTime).getTime();
      return start >= fromTime && start <= toTime;
    });
  }

  async getBiasSnapshotForAssets(params: {
    assets: { assetId?: string | null; symbol: string; timeframe?: string }[];
    date: Date;
  }): Promise<BiasSnapshot> {
    void params;
    return mockBiasSnapshot;
  }
}

class LivePerceptionDataSource implements PerceptionDataSource {
  private biasProvider = new DbBiasProvider();

  private static ORDERFLOW_MODE_MAPPING: Record<
    OrderflowMode,
    "buyers_dominant" | "sellers_dominant" | "balanced"
  > = {
    buyers: "buyers_dominant",
    sellers: "sellers_dominant",
    balanced: "balanced",
  };

  async getSetupsForToday(): Promise<Setup[]> {
    const assets = await getActiveAssets();
    const evaluationDate = new Date();
    const setups: Setup[] = [];
    const profiles: SetupProfile[] = ["SWING", "INTRADAY"];

    await Promise.all(
      assets.map(async (asset, index) => {
        const template = setupDefinitions[index % setupDefinitions.length];
        const direction = index % 2 === 0 ? "Long" : "Short";
        const normalizedDirection = direction.toLowerCase() as "long" | "short";
        const supportedTimeframes = getTimeframesForAsset(asset);

        for (const profile of profiles) {
          const config = getSetupProfileConfig(profile);
          const baseTimeframe = this.normalizeTimeframe(config.primaryTimeframe);
          if (profile === "INTRADAY" && !supportedTimeframes.includes(baseTimeframe)) {
            continue;
          }

          const setup = await this.buildSetupForProfile({
            asset,
            template,
            direction,
            normalizedDirection,
            profile,
            baseTimeframe,
            evaluationDate,
          });
          if (setup) {
            setups.push(setup);
          }
        }
      }),
    );

    return setups;
  }

  async getEventsForWindow(params: { from: Date; to: Date }): Promise<Event[]> {
    const rows = await getEventsInRange(params);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      category: mapCategory(row.category),
      severity:
        row.impact >= 3 ? "high" : row.impact === 2 ? "medium" : "low",
      startTime: row.scheduledAt.toISOString(),
      endTime: null,
      symbols: Array.isArray(row.affectedAssets)
        ? row.affectedAssets.map(String)
        : [],
      source: row.source,
    }));
  }

  async getBiasSnapshotForAssets(params: {
    assets: { assetId?: string | null; symbol: string; timeframe?: string }[];
    date: Date;
  }): Promise<BiasSnapshot> {
    const uniqueAssets = new Map<
      string,
      { key: string; assetId: string; symbol: string; timeframe: string }
    >();

    for (const asset of params.assets) {
      const assetId = asset.assetId ?? asset.symbol;
      const timeframe = asset.timeframe ?? "1D";
      const key = `${assetId}-${timeframe}`;
      if (!uniqueAssets.has(key)) {
        uniqueAssets.set(key, { key, assetId, symbol: asset.symbol, timeframe });
      }
    }

    const biasRows = await Promise.all(
      Array.from(uniqueAssets.values()).map(async (asset) => {
        const result = await this.biasProvider.getBiasSnapshot({
          assetId: asset.assetId,
          date: params.date,
          timeframe: asset.timeframe as Timeframe,
        });

        if (!result) return null;
        return { ...result, symbol: asset.symbol, timeframe: asset.timeframe };
      }),
    );

    const filtered = biasRows.filter(
      (row): row is BiasDomainModel & { symbol: string; timeframe: string } => row !== null,
    );

    const entries: BiasSnapshot["entries"] = filtered.map((bias) => ({
      symbol: bias.symbol,
      timeframe: bias.timeframe,
      direction: bias.biasScore > 0 ? "Bullish" as const : bias.biasScore < 0 ? "Bearish" as const : "Neutral",
      confidence: bias.confidence,
      biasScore: bias.biasScore,
      comment: "",
    }));

    const generatedAt =
      filtered.length > 0
        ? new Date(
            Math.max(
              ...filtered.map((row) => row.date.getTime()),
            ),
          ).toISOString()
        : params.date.toISOString();

    return {
      generatedAt,
      universe: Array.from(uniqueAssets.values()).map((asset) => asset.assetId),
      entries,
      version: "live",
    };
  }

  private normalizeTimeframe(timeframe: string): MarketTimeframe {
    const upper = timeframe.toUpperCase();
    if (upper === "4H" || upper === "1H") {
      return upper as MarketTimeframe;
    }
    if (upper === "15M") {
      return "15m";
    }
    return "1D";
  }

  private async buildSetupForProfile(params: {
    asset: Asset;
    template: SetupDefinition;
    direction: "Long" | "Short";
    normalizedDirection: "long" | "short";
    profile: SetupProfile;
    baseTimeframe: MarketTimeframe;
    evaluationDate: Date;
  }): Promise<Setup | null> {
    const { asset, template, direction, normalizedDirection, profile, baseTimeframe, evaluationDate } = params;
    const levelCategory = resolveLevelCategory(template);
    const candle = await this.ensureLatestCandle(asset, baseTimeframe);
    await this.ensureSupplementalTimeframes(asset, baseTimeframe);
    const referencePrice = candle ? Number(candle.close) : 0;

    if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
      if (profile !== "SWING") {
        console.warn(
          `[LivePerceptionDataSource] skip setup for ${asset.symbol} (${profile}) due to missing price on ${baseTimeframe}`,
        );
        return null;
      }
      console.warn(
        `[LivePerceptionDataSource] building fallback setup for ${asset.symbol} (${profile}) with missing price on ${baseTimeframe}`,
      );
    }

    const computedLevels = computeLevelsForSetup({
      direction: normalizedDirection,
      referencePrice,
      volatilityScore: 50,
      category: levelCategory,
      profile,
    });

    const biasSnapshot = await this.biasProvider.getBiasSnapshot({
      assetId: asset.id,
      date: evaluationDate,
      timeframe: baseTimeframe as Timeframe,
    });
    const normalizedBiasScore = this.normalizeBiasScore(biasSnapshot?.biasScore);

    const timeframes = getTimeframesForAsset(asset);
    const metrics = await buildMarketMetrics({
      asset,
      referencePrice,
      timeframes,
    });
    const orderflow = await buildOrderflowMetrics({
      asset,
      timeframes,
      trendScore: metrics.trendScore,
      biasScore: normalizedBiasScore,
    });
    const orderflowMode =
      LivePerceptionDataSource.ORDERFLOW_MODE_MAPPING[orderflow.mode];
    const volatilityLabel = this.mapVolatilityLabel(metrics.volatilityScore);
    const sentimentContext: SentimentContext = {
      biasScore: normalizedBiasScore,
      trendScore: metrics.trendScore,
      momentumScore: metrics.momentumScore,
      orderflowScore: orderflow.flowScore,
      eventScore: 50,
      rrr: computedLevels.riskReward.rrr ?? undefined,
      riskPercent: computedLevels.riskReward.riskPercent ?? undefined,
      volatilityLabel,
      driftPct: metrics.priceDriftPct,
    };
    const sentiment = await this.buildSentimentMetricsForAsset(asset, sentimentContext);

    const enhancedRiskReward = {
      ...computedLevels.riskReward,
      volatilityLabel,
    };

    let confidence = deriveBaseConfidenceScore(metrics);
    const sentimentAdjustment = this.adjustConfidenceForSentiment(confidence, sentiment);
    confidence = sentimentAdjustment.adjusted;
    const orderflowAdjustment = applyOrderflowConfidenceAdjustment({
      base: confidence,
      orderflow,
    });
    confidence = orderflowAdjustment.adjusted;
    const orderflowConfidenceDelta = orderflowAdjustment.delta;

    const rings = {
      ...createDefaultRings(),
      trendScore: metrics.trendScore,
      orderflowScore: orderflow.flowScore,
      sentimentScore: sentiment.score,
      sentiment: sentiment.score,
      biasScore: normalizedBiasScore ?? 50,
      bias: normalizedBiasScore ?? 50,
      confidenceScore: confidence,
      orderflow: orderflow.flowScore,
    };

    const orderflowMeta = {
      clv: orderflow.clv,
      relVolume: orderflow.relVolume,
      expansion: orderflow.expansion,
      consistency: orderflow.consistency,
      timeframeSamples: orderflow.meta?.timeframeSamples,
      context: orderflow.meta?.context,
    };

    const profileSuffix = profile === "SWING" ? "" : `-${profile.toLowerCase()}`;
    return {
      id: `${asset.id}-${template.id}${profileSuffix}`,
      assetId: asset.id,
      symbol: asset.symbol,
      timeframe: getSetupProfileConfig(profile).primaryTimeframe,
      profile,
      direction,
      confidence,
      eventScore: rings.eventScore,
      biasScore: rings.biasScore,
      sentimentScore: sentiment.score,
      balanceScore: rings.orderflowScore,
      entryZone: computedLevels.entryZone,
      stopLoss: computedLevels.stopLoss,
      takeProfit: computedLevels.takeProfit,
      category: levelCategory,
      levelDebug: computedLevels.debug,
      riskReward: enhancedRiskReward,
      type: "Regelbasiert",
      accessLevel: "free",
      rings,
      orderflowMode,
      sentiment: {
        score: sentiment.score,
        label: sentiment.label,
        reasons: sentiment.reasons,
        raw: this.normalizeSentimentRaw(sentiment.raw),
        contributions: sentiment.contributions,
        flags: sentiment.flags,
        dominantDrivers: sentiment.dominantDrivers,
        confidenceDelta: sentimentAdjustment.delta,
      },
      orderflow: {
        score: orderflow.flowScore,
        mode: orderflow.mode,
        clv: orderflow.clv,
        relVolume: orderflow.relVolume,
        expansion: orderflow.expansion,
        consistency: orderflow.consistency,
        reasons: orderflow.reasons,
        reasonDetails: orderflow.reasonDetails,
        flags: orderflow.flags,
        meta: orderflowMeta,
        confidenceDelta: orderflowConfidenceDelta,
      },
      validity: {
        isStale: metrics.isStale,
        reasons: metrics.reasons,
        priceDriftPct: metrics.priceDriftPct,
        lastPrice: metrics.lastPrice,
        evaluatedAt: metrics.evaluatedAt,
      },
    } satisfies Setup;
  }

  private async ensureLatestCandle(
    asset: Asset,
    timeframe: MarketTimeframe
  ) {
    let candle = await getLatestCandleForAsset({
      assetId: asset.id,
      timeframe,
    });
    if (this.isCandleValid(candle)) {
      return candle;
    }

    await this.syncCandlesForAsset(asset, timeframe);
    candle = await getLatestCandleForAsset({
      assetId: asset.id,
      timeframe,
    });
    if (!this.isCandleValid(candle)) {
      console.error(
        `[LivePerceptionDataSource] no candle available for ${asset.symbol} (${timeframe}) after fallback`,
      );
    }
    return candle;
  }

  private async ensureSupplementalTimeframes(asset: Asset, base: MarketTimeframe) {
    const configured = getTimeframesForAsset(asset);
    const extras = configured.filter((tf) => tf !== base);
    await Promise.all(extras.map((tf) => this.syncCandlesForAsset(asset, tf)));
  }

  private async buildSentimentMetricsForAsset(
    asset: Asset,
    context: SentimentContext,
  ): Promise<SentimentMetrics> {
    const provider = resolveSentimentProvider(asset);
    if (!provider) {
      return buildSentimentMetrics({ asset, sentiment: null });
    }

    try {
      const snapshot = await provider.fetchSentiment({ asset, context });
      return buildSentimentMetrics({ asset, sentiment: snapshot });
    } catch (error) {
      console.warn(
        `[LivePerceptionDataSource] failed to fetch sentiment for ${asset.symbol}`,
        error,
      );
      return buildSentimentMetrics({ asset, sentiment: null });
    }
  }

  private async syncCandlesForAsset(asset: Asset, timeframe: MarketTimeframe) {
    const to = new Date();
    const windowDays = TIMEFRAME_SYNC_WINDOWS[timeframe] ?? MARKETDATA_SYNC_WINDOW_DAYS;
    const from = new Date(to);
    from.setDate(to.getDate() - windowDays + 1);

    try {
      await syncDailyCandlesForAsset({
        asset,
        timeframe,
        from,
        to,
      });
    } catch (error) {
      console.warn(
        `[LivePerceptionDataSource] failed to sync candles for ${asset.symbol}:`,
        error
      );
    }
  }

  private isCandleValid(candle?: { close?: string | number | null } | null) {
    if (!candle) {
      return false;
    }
    const close = Number(candle.close);
    return Number.isFinite(close) && close > 0;
  }

  private mapVolatilityLabel(score: number): VolatilityLabel {
    if (score < 35) return "low";
    if (score < 65) return "medium";
    return "high";
  }

  private normalizeSentimentRaw(raw?: SentimentRawSnapshot | null) {
    if (!raw) return undefined;
    return {
      source: raw.source,
      profileKey: raw.profileKey,
      timestamp: raw.timestamp?.toISOString(),
      baseScore: raw.baseScore ?? undefined,
      biasScore: raw.biasScore,
      trendScore: raw.trendScore,
      momentumScore: raw.momentumScore,
      orderflowScore: raw.orderflowScore,
      eventScore: raw.eventScore,
      rrr: raw.rrr,
      riskPercent: raw.riskPercent,
      volatilityLabel: raw.volatilityLabel,
      driftPct: raw.driftPct,
    };
  }

  private deriveConfidenceScore(metrics: MarketMetrics): number {
    let value = 65 + (metrics.trendScore - 50) * 0.3 + (metrics.momentumScore - 50) * 0.2;
    value -= Math.abs(metrics.priceDriftPct) * 0.5;
    if (metrics.isStale) value -= 20;
    if (metrics.volatilityScore > 70) value -= 5;
    return this.clampScore(value);
  }

  private adjustConfidenceForSentiment(value: number, sentiment: SentimentMetrics): ConfidenceAdjustmentResult {
    return applySentimentConfidenceAdjustment({ base: value, sentiment });
  }

  private normalizeBiasScore(raw?: number | null): number | undefined {
    if (typeof raw !== "number") {
      return undefined;
    }
    const normalized = (raw + 100) / 2;
    return this.clampScore(normalized);
  }

  private clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}

export function createPerceptionDataSource(): PerceptionDataSource {
  const mode = getPerceptionDataMode();

  if (mode === "live") {
    return new LivePerceptionDataSource();
  }

  return new MockPerceptionDataSource();
}
