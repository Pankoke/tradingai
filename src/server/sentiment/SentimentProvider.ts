import type { Asset } from "@/src/server/repositories/assetRepository";

export type SentimentContext = {
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

export type SentimentRawSnapshot = {
  assetId: string;
  symbol: string;
  source: string;
  timestamp: Date;
  fundingRate: number | null;
  fundingRateAnnualized?: number | null;
  openInterestUsd: number | null;
  openInterestChangePct: number | null;
  longLiquidationsUsd?: number | null;
  shortLiquidationsUsd?: number | null;
  longShortRatio?: number | null;
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

export interface SentimentProvider {
  readonly source: string;
  fetchSentiment(params: {
    asset: Asset;
    context?: SentimentContext;
  }): Promise<SentimentRawSnapshot | null>;
  getLastDebug(): SentimentProviderDebug | null;
}

export type SentimentProviderDebug = {
  requestedSymbol?: string;
  timestamp: string;
  message?: string;
  contextIncluded?: boolean;
};
