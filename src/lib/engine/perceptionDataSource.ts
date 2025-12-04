import type { Setup } from "./types";
import type { BiasSnapshot, Event } from "./eventsBiasTypes";
import { mockSetups } from "@/src/lib/mockSetups";
import { mockEvents } from "@/src/lib/mockEvents";
import { mockBiasSnapshot } from "@/src/lib/mockBias";
import { setupDefinitions, type SetupDefinition } from "@/src/lib/engine/setupDefinitions";
import { computeLevelsForSetup, type SetupLevelCategory } from "@/src/lib/engine/levels";
import { syncDailyCandlesForAsset } from "@/src/features/marketData/syncDailyCandles";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { getEventsInRange } from "@/src/server/repositories/eventRepository";
import { DbBiasProvider, type BiasDomainModel } from "@/src/server/providers/biasProvider";
import { getLatestCandleForAsset } from "@/src/server/repositories/candleRepository";
import type { Timeframe } from "@/src/server/providers/marketDataProvider";

export type PerceptionDataMode = "mock" | "live";

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

  async getBiasSnapshotForAssets(_: {
    assets: { assetId?: string | null; symbol: string; timeframe?: string }[];
    date: Date;
  }): Promise<BiasSnapshot> {
    return mockBiasSnapshot;
  }
}

class LivePerceptionDataSource implements PerceptionDataSource {
  private biasProvider = new DbBiasProvider();

  private createDefaultRings(): Setup["rings"] {
    return {
      trendScore: 50,
      eventScore: 50,
      biasScore: 50,
      sentimentScore: 50,
      orderflowScore: 50,
      confidenceScore: 50,
      event: 50,
      bias: 50,
      sentiment: 50,
      orderflow: 50,
      confidence: 50,
    };
  }

  async getSetupsForToday(): Promise<Setup[]> {
    const assets = await getActiveAssets();
    const setups = await Promise.all(
      assets.map(async (asset, index) => {
        const template = setupDefinitions[index % setupDefinitions.length];
        const direction = index % 2 === 0 ? "Long" : "Short";
        const normalizedDirection = direction.toLowerCase() as "long" | "short";
        const timeframe = template.defaultTimeframe ?? "1D";
        const candle = await this.ensureLatestCandle(
          { id: asset.id, symbol: asset.symbol },
          timeframe
        );
        const levelCategory = resolveLevelCategory(template);
        const computedLevels = computeLevelsForSetup({
          direction: normalizedDirection,
          referencePrice: candle ? Number(candle.close) : 0,
          volatilityScore: 50,
          category: levelCategory,
        });

        return {
          id: `${asset.id}-${template.id}`,
          assetId: asset.id,
          symbol: asset.symbol,
          timeframe,
          direction,
          confidence: 50,
          eventScore: 50,
          biasScore: 50,
          sentimentScore: 50,
          balanceScore: 50,
          entryZone: computedLevels.entryZone,
          stopLoss: computedLevels.stopLoss,
          takeProfit: computedLevels.takeProfit,
          category: levelCategory,
          levelDebug: computedLevels.debug,
          riskReward: computedLevels.riskReward,
          type: "Regelbasiert",
          accessLevel: "free",
          rings: this.createDefaultRings(),
        } satisfies Setup;
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

  private async ensureLatestCandle(
    asset: { id: string; symbol: string },
    timeframe: string
  ) {
    let candle = await getLatestCandleForAsset({
      assetId: asset.id,
      timeframe,
    });
    if (this.isCandleValid(candle)) {
      return candle;
    }

    await this.syncCandlesForAsset(asset);
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

  private async syncCandlesForAsset(asset: { id: string; symbol: string }) {
    const to = new Date();
    const from = new Date(to);
    from.setDate(to.getDate() - MARKETDATA_SYNC_WINDOW_DAYS + 1);

    try {
      await syncDailyCandlesForAsset({
        assetId: asset.id,
        symbol: asset.symbol,
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
}

export function createPerceptionDataSource(): PerceptionDataSource {
  const envMode = (process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE ?? "").toLowerCase();
  const mode: PerceptionDataMode = envMode === "live" ? "live" : "mock";

  if (mode === "live") {
    return new LivePerceptionDataSource();
  }

  return new MockPerceptionDataSource();
}
