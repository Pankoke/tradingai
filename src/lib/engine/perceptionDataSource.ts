import type { Setup, VolatilityLabel } from "./types";
import type { BiasSnapshot, Event } from "./eventsBiasTypes";
import { mockSetups } from "@/src/lib/mockSetups";
import { mockEvents } from "@/src/lib/mockEvents";
import { mockBiasSnapshot } from "@/src/lib/mockBias";
import { setupDefinitions, type SetupDefinition } from "@/src/lib/engine/setupDefinitions";
import { computeLevelsForSetup, type SetupLevelCategory } from "@/src/lib/engine/levels";
import type { CandleRow, CandleTimeframe } from "@/src/domain/market-data/types";
import type { EventRepositoryPort } from "@/src/domain/events/ports";
import type { EventRow } from "@/src/domain/events/types";
import type { CandleRepositoryPort } from "@/src/domain/market-data/ports";
import type { SentimentProviderPort } from "@/src/domain/sentiment/ports";
import type { SentimentSnapshot } from "@/src/domain/sentiment/types";
import { buildMarketMetrics } from "@/src/lib/engine/marketMetrics";
import type { MarketMetrics } from "@/src/lib/engine/marketMetrics";
import {
  buildOrderflowMetrics,
  type OrderflowMode,
} from "@/src/lib/engine/orderflowMetrics";
import { selectCandleWindow } from "@/src/domain/market-data/services/selectCandleWindow";
import { getPerceptionDataMode } from "@/src/lib/config/perceptionDataMode";
import { buildSentimentMetrics, type SentimentMetrics } from "@/src/lib/engine/sentimentMetrics";
import {
  applySentimentConfidenceAdjustment,
  type ConfidenceAdjustmentResult,
} from "@/src/lib/engine/sentimentAdjustments";
import { deriveBaseConfidenceScore } from "@/src/lib/engine/confidence";
import { createDefaultRings } from "@/src/lib/engine/rings";
import { applyOrderflowConfidenceAdjustment } from "@/src/lib/engine/orderflowAdjustments";
import { getSetupProfileConfig, type SetupProfile } from "@/src/lib/config/setupProfile";
import { logger } from "@/src/lib/logger";

export interface PerceptionDataSource {
  getSetupsForToday(params: { asOf: Date }): Promise<Setup[]>;
  getEventsForWindow(params: { from: Date; to: Date }): Promise<Event[]>;
  getBiasSnapshotForAssets(params: {
    assets: { assetId?: string | null; symbol: string; timeframe?: string }[];
    asOf: Date;
  }): Promise<BiasSnapshot>;
}

type AssetLike = {
  id: string;
  symbol: string;
  assetClass?: string | null;
};

type BiasDomainModel = {
  assetId: string;
  date: Date;
  timeframe: string;
  biasScore: number;
  confidence: number;
};

type MarketTimeframe = CandleTimeframe;

type BiasProvider = {
  getBiasSnapshot(params: { assetId: string; date: Date; timeframe: string; asOf?: Date }): Promise<BiasDomainModel | null>;
};

type SentimentContext = {
  biasScore?: number;
  trendScore?: number;
  momentumScore?: number;
  orderflowScore?: number;
  eventScore?: number;
  rrr?: number;
  riskPercent?: number;
  volatilityLabel?: string;
  driftPct?: number;
};

type SentimentAsset = {
  id: string;
  symbol: string;
  assetClass?: string | null;
};

type AssetForSentiment = {
  id: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  assetClass: string;
  baseCurrency: string | null;
  quoteCurrency: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type TimeframeConfigDeps = {
  getProfileTimeframes(profile: SetupProfile, asset: AssetLike): MarketTimeframe[];
  getTimeframesForAsset(asset: AssetLike): MarketTimeframe[];
  TIMEFRAME_SYNC_WINDOWS: Record<MarketTimeframe, number>;
};

export type PerceptionDataSourceDeps = {
  assets: { getActiveAssets(): Promise<AssetLike[]> };
  events: EventRepositoryPort;
  candles: CandleRepositoryPort;
  sentiment: SentimentProviderPort;
  biasProvider: BiasProvider;
  timeframeConfig: TimeframeConfigDeps;
  resolveProviderSymbol: (asset: AssetLike, source: string) => string | null | undefined;
  syncCandles?: (params: { asset: AssetLike; timeframe: MarketTimeframe; from: Date; to: Date }) => Promise<void>;
  allowSync?: boolean;
};

const EVENT_CATEGORIES = ["macro", "crypto", "onchain", "technical", "other"] as const;
type EventCategory = (typeof EVENT_CATEGORIES)[number];

function mapCategory(value: string): EventCategory {
  if (EVENT_CATEGORIES.includes(value as EventCategory)) {
    return value as EventCategory;
  }
  return "other";
}

function mapEventRowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: mapCategory(row.category),
    severity: row.impact >= 3 ? "high" : row.impact === 2 ? "medium" : "low",
    startTime: row.scheduledAt.toISOString(),
    endTime: null,
    symbols: Array.isArray(row.affectedAssets) ? row.affectedAssets.map(String) : [],
    source: row.source,
  };
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
const INTRADAY_STALE_MINUTES = 180;
const CANDLE_LOOKBACK_COUNT: Record<MarketTimeframe, number> = {
  "1D": 120,
  "1W": 120,
  "4H": 90,
  "1H": 72,
  "15m": 60,
};
const PRIMARY_CANDLE_LOOKBACK_COUNT = 3;

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
      return 15 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

class MockPerceptionDataSource implements PerceptionDataSource {
  async getSetupsForToday(params: { asOf: Date }): Promise<Setup[]> {
    void params;
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

  async getBiasSnapshotForAssets(_params: {
    assets: { assetId?: string | null; symbol: string; timeframe?: string }[];
    asOf: Date;
  }): Promise<BiasSnapshot> {
    return mockBiasSnapshot;
  }
}

class LivePerceptionDataSource implements PerceptionDataSource {
  constructor(
    private readonly deps: PerceptionDataSourceDeps,
    private readonly allowedProfiles: SetupProfile[],
    private readonly assetFilter?: string[],
  ) {}

  private static ORDERFLOW_MODE_MAPPING: Record<
    OrderflowMode,
    "buyers_dominant" | "sellers_dominant" | "balanced"
  > = {
    buyers: "buyers_dominant",
    sellers: "sellers_dominant",
    balanced: "balanced",
  };

  async getSetupsForToday(params: { asOf: Date }): Promise<Setup[]> {
    const assets = await this.getFilteredAssets();
    const evaluationDate = params.asOf;
    const setups: Setup[] = [];
    const profiles: SetupProfile[] = this.allowedProfiles.length
      ? this.allowedProfiles
      : (["SWING", "INTRADAY", "POSITION"] satisfies SetupProfile[]);

    await Promise.all(
      assets.map(async (asset, index) => {
        const template = setupDefinitions[index % setupDefinitions.length];
        const direction = index % 2 === 0 ? "Long" : "Short";
        const normalizedDirection = direction.toLowerCase() as "long" | "short";

        for (const profile of profiles) {
          const config = getSetupProfileConfig(profile);
          const baseTimeframe = this.normalizeTimeframe(config.primaryTimeframe);
          const supportedTimeframes = this.deps.timeframeConfig.getProfileTimeframes(profile, asset);
          if (!supportedTimeframes.includes(baseTimeframe)) {
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

  private async getFilteredAssets(): Promise<AssetLike[]> {
    const assets = await this.deps.assets.getActiveAssets();
    if (!this.assetFilter || !this.assetFilter.length) return assets;
    const set = new Set(this.assetFilter.map((v) => v.toUpperCase()));
    return assets.filter((asset) => set.has(asset.id.toUpperCase()) || set.has(asset.symbol.toUpperCase()));
  }

  async getEventsForWindow(params: { from: Date; to: Date }): Promise<Event[]> {
    const rows = await this.deps.events.findRelevant({
      assetId: "",
      from: params.from,
      to: params.to,
    });
    return rows.map(mapEventRowToEvent);
  }

  async getBiasSnapshotForAssets(params: {
    assets: { assetId?: string | null; symbol: string; timeframe?: string }[];
    asOf: Date;
  }): Promise<BiasSnapshot> {
    const referenceDate = params.asOf;
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
        const result = await this.deps.biasProvider.getBiasSnapshot({
          assetId: asset.assetId,
          date: referenceDate,
          asOf: referenceDate,
          timeframe: asset.timeframe,
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
        : referenceDate.toISOString();

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
    if (upper === "1W") {
      return "1W";
    }
    return "1D";
  }

  private async buildSetupForProfile(params: {
    asset: AssetLike;
    template: SetupDefinition;
    direction: "Long" | "Short";
    normalizedDirection: "long" | "short";
    profile: SetupProfile;
    baseTimeframe: MarketTimeframe;
    evaluationDate: Date;
  }): Promise<Setup | null> {
    const { asset, template, direction, normalizedDirection, profile, baseTimeframe, evaluationDate } = params;
    const profileConfig = getSetupProfileConfig(profile);
    const levelCategory = resolveLevelCategory(template);
    const dataSourcePrimary = "unknown";
    const candle = await this.ensureLatestCandle(asset, baseTimeframe, evaluationDate);
    await this.ensureSupplementalTimeframes(asset, baseTimeframe, evaluationDate);
    if (profile === "INTRADAY" && isIntradayCandleStale(candle ?? null, evaluationDate, INTRADAY_STALE_MINUTES)) {
      logger.warn("[LivePerceptionDataSource] skipping intraday setup: stale/missing candle", {
        symbol: asset.symbol,
        timeframe: baseTimeframe,
        thresholdMinutes: INTRADAY_STALE_MINUTES,
        candleTimestamp: candle?.timestamp,
        now: evaluationDate,
      });
      return null;
    }
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
      bandScale: profileConfig.levelsDefaults?.bandScale,
    });

    const biasSnapshot = await this.deps.biasProvider.getBiasSnapshot({
      assetId: asset.id,
      date: evaluationDate,
      timeframe: baseTimeframe,
    });
    const normalizedBiasScore = this.normalizeBiasScore(biasSnapshot?.biasScore);

    const timeframes = this.deps.timeframeConfig.getProfileTimeframes(profile, asset);
    const candlesByTimeframe = await this.loadCandlesForTimeframes(asset, timeframes, evaluationDate);

    const metrics = await buildMarketMetrics({
      candlesByTimeframe,
      referencePrice,
      timeframes,
      now: evaluationDate,
      profile,
    });
    const orderflow = await buildOrderflowMetrics({
      candlesByTimeframe,
      timeframes,
      trendScore: metrics.trendScore,
      biasScore: normalizedBiasScore,
      assetClass: asset.assetClass ?? null,
      now: evaluationDate,
      neutralizeStaleMinutes: profile === "SWING" ? INTRADAY_STALE_MINUTES : undefined,
    });
    const orderflowMode =
      LivePerceptionDataSource.ORDERFLOW_MODE_MAPPING[orderflow.mode];
    const volatilityLabel = this.mapVolatilityLabel(metrics.volatilityScore);
    const safeRiskReward = computedLevels.riskReward ?? {
      riskPercent: null,
      rewardPercent: null,
      rrr: null,
      volatilityLabel,
    };
    const sentimentContext: SentimentContext = {
      biasScore: normalizedBiasScore,
      trendScore: metrics.trendScore,
      momentumScore: metrics.momentumScore,
      orderflowScore: orderflow.flowScore,
      eventScore: 50,
      rrr: safeRiskReward.rrr ?? undefined,
      riskPercent: safeRiskReward.riskPercent ?? undefined,
      volatilityLabel,
      driftPct: metrics.priceDriftPct,
    };
    const sentiment = await this.buildSentimentMetricsForAsset(asset, sentimentContext, evaluationDate);

    const enhancedRiskReward = {
      ...safeRiskReward,
      volatilityLabel,
    };

    let confidence = deriveBaseConfidenceScore(metrics, { profile });
    const sentimentAdjustment = this.adjustConfidenceForSentiment(confidence, sentiment);
    confidence = sentimentAdjustment.adjusted;
    const orderflowAdjustment = applyOrderflowConfidenceAdjustment({
      base: confidence,
      orderflow,
    });
    confidence = orderflowAdjustment.adjusted;
    const orderflowConfidenceDelta = orderflowAdjustment.delta;
    const dataSourceUsed =
      typeof candle?.source === "string" && candle.source
        ? (candle.source as typeof dataSourcePrimary)
        : dataSourcePrimary;
    const providerSymbolUsed = this.deps.resolveProviderSymbol(asset, dataSourceUsed) ?? undefined;

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
      dataSourcePrimary,
      dataSourceUsed,
      providerSymbolUsed,
      timeframeUsed: baseTimeframe,
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
    asset: AssetLike,
    timeframe: MarketTimeframe,
    asOf: Date,
  ) {
    let candle = await this.getCandlesWindow({
      assetId: asset.id,
      timeframe,
      asOf,
      lookback: PRIMARY_CANDLE_LOOKBACK_COUNT,
    }).then((rows) => this.normalizeCandleTimestamp(rows[0] as CandleRow | undefined));
    if (this.isCandleValid(candle)) {
      return candle;
    }

    if (!this.deps.allowSync) {
      logger.warn("[LivePerceptionDataSource] skipping candle sync in read-only mode", {
        symbol: asset.symbol,
        timeframe,
      });
      return candle;
    }

    await this.syncCandlesForAsset(asset, timeframe, asOf);
    candle = await this.getCandlesWindow({
      assetId: asset.id,
      timeframe,
      asOf,
      lookback: PRIMARY_CANDLE_LOOKBACK_COUNT,
    }).then((rows) => this.normalizeCandleTimestamp(rows[0] as CandleRow | undefined));
    if (!this.isCandleValid(candle)) {
      console.error(
        `[LivePerceptionDataSource] no candle available for ${asset.symbol} (${timeframe}) after fallback`,
      );
    }
    return candle;
  }

  private async ensureSupplementalTimeframes(asset: AssetLike, base: MarketTimeframe, asOf: Date) {
    if (!this.deps.allowSync) {
      return;
    }
    const configured = this.deps.timeframeConfig.getTimeframesForAsset(asset);
    const extras = configured.filter((tf) => tf !== base);
    await Promise.all(extras.map((tf) => this.syncCandlesForAsset(asset, tf, asOf)));
  }

  private async buildSentimentMetricsForAsset(
    asset: AssetLike,
    _context: SentimentContext,
    asOf: Date,
  ): Promise<SentimentMetrics> {
    try {
      const snapshot: SentimentSnapshot = await this.deps.sentiment.fetchSentiment({
        assetId: asset.id,
        asOf,
      });
      const sentimentAsset: SentimentAsset = {
        id: asset.id,
        symbol: asset.symbol,
        assetClass: asset.assetClass ?? null,
      };
      const sentimentAssetFull: AssetForSentiment = {
        id: sentimentAsset.id,
        symbol: sentimentAsset.symbol,
        displaySymbol: sentimentAsset.symbol,
        name: sentimentAsset.symbol,
        assetClass: sentimentAsset.assetClass ?? "unknown",
        baseCurrency: null,
        quoteCurrency: null,
        isActive: true,
        createdAt: null,
        updatedAt: null,
      };
      return buildSentimentMetrics({
        asset: sentimentAssetFull,
        sentiment: snapshot,
      });
    } catch (error) {
      console.warn(
        `[LivePerceptionDataSource] failed to fetch sentiment for ${asset.symbol}`,
        error,
      );
      const sentimentAssetFull: AssetForSentiment = {
        id: asset.id,
        symbol: asset.symbol,
        displaySymbol: asset.symbol,
        name: asset.symbol,
        assetClass: asset.assetClass ?? "unknown",
        baseCurrency: null,
        quoteCurrency: null,
        isActive: true,
        createdAt: null,
        updatedAt: null,
      };
      return buildSentimentMetrics({ asset: sentimentAssetFull, sentiment: null });
    }
  }

  private async syncCandlesForAsset(asset: AssetLike, timeframe: MarketTimeframe, asOf: Date) {
    if (!this.deps.allowSync || !this.deps.syncCandles) {
      return;
    }
    const to = new Date(asOf);
    const windowDays = this.deps.timeframeConfig.TIMEFRAME_SYNC_WINDOWS[timeframe] ?? MARKETDATA_SYNC_WINDOW_DAYS;
    const from = new Date(to);
    from.setDate(to.getDate() - windowDays + 1);

    try {
      await this.deps.syncCandles({
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

  private normalizeCandleTimestamp(candle?: CandleRow | null): CandleRow | null {
    if (!candle) return null;
    const ts = candle.timestamp;
    if (ts instanceof Date && Number.isFinite(ts.getTime())) {
      return candle;
    }
    if (typeof ts === "string" || typeof ts === "number") {
      const parsed = new Date(ts);
      if (Number.isFinite(parsed.getTime())) {
        return { ...candle, timestamp: parsed };
      }
    }
    logger.warn("[LivePerceptionDataSource] dropping candle with invalid timestamp", {
      assetId: candle.assetId,
      timeframe: candle.timeframe,
      timestamp: ts,
    });
    return null;
  }

  private isCandleValid(candle?: CandleRow | null): candle is CandleRow {
    if (!candle) {
      return false;
    }
    const close = Number(candle.close);
    const ts = candle.timestamp;
    const timestampOk = ts instanceof Date && Number.isFinite(ts.getTime());
    return timestampOk && Number.isFinite(close) && close > 0;
  }

  private mapVolatilityLabel(score: number): VolatilityLabel {
    if (score < 35) return "low";
    if (score < 65) return "medium";
    return "high";
  }

  private normalizeSentimentRaw(raw?: unknown) {
    if (!raw || typeof raw !== "object" || raw === null) return undefined;
    const obj = raw as Record<string, unknown>;
    const timestamp = typeof obj.timestamp === "string" ? obj.timestamp : undefined;
    const profileKey = typeof obj.profileKey === "string" ? obj.profileKey : undefined;
    const numberOrUndefined = (value: unknown) => (typeof value === "number" ? value : undefined);
    const stringOrUndefined = (value: unknown) => (typeof value === "string" ? value : undefined);
    return {
      source: stringOrUndefined(obj.source),
      profileKey,
      timestamp,
      baseScore: numberOrUndefined(obj.baseScore),
      biasScore: numberOrUndefined(obj.biasScore),
      trendScore: numberOrUndefined(obj.trendScore),
      momentumScore: numberOrUndefined(obj.momentumScore),
      orderflowScore: numberOrUndefined(obj.orderflowScore),
      eventScore: numberOrUndefined(obj.eventScore),
      rrr: numberOrUndefined(obj.rrr),
      riskPercent: numberOrUndefined(obj.riskPercent),
      volatilityLabel: stringOrUndefined(obj.volatilityLabel),
      driftPct: numberOrUndefined(obj.driftPct),
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

  private async loadCandlesForTimeframes(
    asset: AssetLike,
    timeframes: MarketTimeframe[],
    asOf: Date,
  ): Promise<Record<MarketTimeframe, CandleRow[]>> {
    const result: Record<MarketTimeframe, CandleRow[]> = {} as Record<MarketTimeframe, CandleRow[]>;
    const unique = Array.from(new Set(timeframes));

    await Promise.all(
      unique.map(async (tf) => {
        const rows = await this.getCandlesWindow({
          assetId: asset.id,
          timeframe: tf,
          asOf,
          lookback: CANDLE_LOOKBACK_COUNT[tf] ?? 60,
        });
        result[tf] = rows;
      }),
    );

    return result;
  }

  private async getCandlesWindow(params: {
    assetId: string;
    timeframe: MarketTimeframe;
    asOf: Date;
    lookback: number;
  }): Promise<CandleRow[]> {
    const durationMs = params.lookback * timeframeToMs(params.timeframe);
    const from = new Date(params.asOf.getTime() - durationMs);
    const rows = await this.deps.candles.findRangeByAsset(
      params.assetId,
      params.timeframe,
      from,
      params.asOf,
    );
    return selectCandleWindow({
      candles: rows,
      asOf: params.asOf,
      lookbackCount: params.lookback,
    }) as CandleRow[];
  }
}

export function createPerceptionDataSource(
  deps: PerceptionDataSourceDeps,
  config?: {
    profiles?: SetupProfile[];
    assetFilter?: string[];
  },
): PerceptionDataSource {
  const mode = getPerceptionDataMode();
  const profiles = config?.profiles ?? (["SWING", "INTRADAY", "POSITION"] satisfies SetupProfile[]);

  if (mode === "live") {
    return new LivePerceptionDataSource(deps, profiles, config?.assetFilter);
  }

  return new MockPerceptionDataSource();
}

export function isIntradayCandleStale(
  candle: { timestamp?: Date | null } | null,
  now: Date,
  thresholdMinutes: number,
): boolean {
  if (!candle) return true;
  if (!candle.timestamp) return true;
  const ageMinutes = Math.abs(now.getTime() - candle.timestamp.getTime()) / 60000;
  return ageMinutes > thresholdMinutes;
}
