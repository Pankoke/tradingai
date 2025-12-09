export type Timeframe = "1D" | "4H" | "1H" | "15m";

export type CandleDomainModel = {
  assetId: string;
  timeframe: Timeframe;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  source: string;
};

export interface MarketDataProvider {
  getCandles(params: {
    assetId: string;
    timeframe: Timeframe;
    from: Date;
    to: Date;
  }): Promise<CandleDomainModel[]>;
}
