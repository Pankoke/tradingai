import type { Timeframe } from "./marketDataProvider";

export type BiasDomainModel = {
  assetId: string;
  date: Date;
  timeframe: Timeframe;
  biasScore: number;
  confidence: number;
  trendScore?: number;
  volatilityScore?: number;
  rangeScore?: number;
};

export interface BiasProvider {
  getBiasSnapshot(params: {
    assetId: string;
    date: Date;
    timeframe: Timeframe;
  }): Promise<BiasDomainModel | null>;
  getBiasForDateRange(params: {
    assetId: string;
    from: Date;
    to: Date;
    timeframe: Timeframe;
  }): Promise<BiasDomainModel[]>;
}
