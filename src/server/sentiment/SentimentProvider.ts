import type { Asset } from "@/src/server/repositories/assetRepository";

export type SentimentRawSnapshot = {
  assetId: string;
  symbol: string;
  fundingRate: number | null;
  fundingRateAnnualized?: number | null;
  openInterestUsd: number | null;
  openInterestChangePct: number | null;
  longLiquidationsUsd?: number | null;
  shortLiquidationsUsd?: number | null;
  source: string;
  timestamp: Date;
  longShortRatio?: number | null;
};

export interface SentimentProvider {
  readonly source: string;
  fetchSentiment(params: { asset: Asset }): Promise<SentimentRawSnapshot | null>;
  getLastDebug(): SentimentProviderDebug | null;
}

export type SentimentProviderDebug = {
  requestedSymbol?: string;
  timestamp: string;
  message?: string;
};
