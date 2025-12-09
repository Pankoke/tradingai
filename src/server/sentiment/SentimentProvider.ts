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
};

export interface SentimentProvider {
  readonly source: string;
  fetchFundingAndOi(params: { asset: Asset }): Promise<SentimentRawSnapshot | null>;
  isEnabled(): boolean;
}
