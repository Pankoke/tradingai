import type { SentimentSnapshot } from "./types";

export interface SentimentProviderPort {
  fetchSentiment(params: { assetId: string; asOf: Date }): Promise<SentimentSnapshot>;
}
