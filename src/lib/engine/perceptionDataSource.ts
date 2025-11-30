import type { Setup } from "./types";
import type { BiasSnapshot, Event } from "./eventsBiasTypes";
import { mockSetups } from "@/src/lib/mockSetups";
import { mockEvents } from "@/src/lib/mockEvents";
import { mockBiasSnapshot } from "@/src/lib/mockBias";
import { setupDefinitions } from "@/src/lib/engine/setupDefinitions";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { getEventsInRange } from "@/src/server/repositories/eventRepository";
import { DbBiasProvider, type BiasDomainModel } from "@/src/server/providers/biasProvider";

export type PerceptionDataMode = "mock" | "live";

export interface PerceptionDataSource {
  getSetupsForToday(params: { asOf: Date }): Promise<Setup[]>;
  getEventsForWindow(params: { from: Date; to: Date }): Promise<Event[]>;
  getBiasSnapshotForAssets(params: { assetIds: string[]; date: Date }): Promise<BiasSnapshot[]>;
}

const EVENT_CATEGORIES = ["macro", "crypto", "onchain", "technical", "other"] as const;
type EventCategory = (typeof EVENT_CATEGORIES)[number];

function mapCategory(value: string): EventCategory {
  if (EVENT_CATEGORIES.includes(value as EventCategory)) {
    return value as EventCategory;
  }
  return "other";
}

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

  async getBiasSnapshotForAssets(): Promise<BiasSnapshot[]> {
    return [mockBiasSnapshot];
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
    return assets.map((asset, index) => {
      const template = setupDefinitions[index % setupDefinitions.length];
      return {
        id: `${asset.id}-${template.id}`,
        assetId: asset.id,
        symbol: asset.symbol,
        timeframe: template.defaultTimeframe ?? "1D",
        direction: index % 2 === 0 ? "Long" : "Short",
        confidence: 50,
        eventScore: 50,
        biasScore: 50,
        sentimentScore: 50,
        balanceScore: 50,
        entryZone: `${asset.symbol} zone`,
        stopLoss: "0",
        takeProfit: "0",
        type: "Regelbasiert",
        accessLevel: "free",
        rings: this.createDefaultRings(),
      } satisfies Setup;
    });
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
    assetIds: string[];
    date: Date;
  }): Promise<BiasSnapshot[]> {
    const promises = params.assetIds.map(async (assetId) => {
      const result = await this.biasProvider.getBiasSnapshot({
        assetId,
        date: params.date,
        timeframe: "1D",
      });
      return result;
    });

    const biasList = await Promise.all(promises);
    return biasList
      .filter((item): item is BiasDomainModel => item !== null)
      .map((bias) => ({
        generatedAt: bias.date.toISOString(),
        universe: [bias.assetId],
        entries: [
          {
            symbol: bias.assetId,
            timeframe: bias.timeframe,
            direction: bias.biasScore >= 0 ? "Bullish" : "Bearish",
            confidence: bias.confidence,
            comment: "",
          },
        ],
        version: "live",
      }));
  }
}

export function createPerceptionDataSource(): PerceptionDataSource {
  const mode = (process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE as PerceptionDataMode) ?? "mock";

  if (mode === "live") {
    return new LivePerceptionDataSource();
  }

  return new MockPerceptionDataSource();
}
