import type { EventRepositoryPort } from "@/src/domain/events/ports";
import type { CandleRepositoryPort, MarketDataProviderPort } from "@/src/domain/market-data/ports";
import type { SentimentProviderPort } from "@/src/domain/sentiment/ports";
import type { SnapshotStorePort } from "@/src/domain/strategy/ports";
import { EventRepositoryAdapter } from "@/src/infrastructure/adapters/eventRepositoryAdapter";
import { MarketDataProviderAdapter } from "@/src/infrastructure/adapters/marketDataProviderAdapter";
import { CandleRepositoryAdapter } from "@/src/infrastructure/adapters/candleRepositoryAdapter";
import { SentimentProviderAdapter } from "@/src/infrastructure/adapters/sentimentProviderAdapter";
import { SnapshotStoreAdapter } from "@/src/infrastructure/adapters/snapshotStoreAdapter";

export type AppContainer = {
  candleRepo: CandleRepositoryPort;
  eventRepo: EventRepositoryPort;
  marketData: MarketDataProviderPort;
  sentiment: SentimentProviderPort;
  snapshotStore: SnapshotStorePort;
};

let cached: AppContainer | null = null;

export function getContainer(): AppContainer {
  if (!cached) {
    cached = {
      candleRepo: new CandleRepositoryAdapter(),
      eventRepo: new EventRepositoryAdapter(),
      marketData: new MarketDataProviderAdapter(),
      sentiment: new SentimentProviderAdapter(),
      snapshotStore: new SnapshotStoreAdapter(),
    };
  }
  return cached;
}
