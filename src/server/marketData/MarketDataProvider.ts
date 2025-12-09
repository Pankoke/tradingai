import type { CandleDomainModel } from "@/src/server/providers/marketDataProvider";
import type { Asset } from "@/src/server/repositories/assetRepository";

export type MarketTimeframe = "1D" | "4H" | "1H" | "15m";

export type MarketDataSource = "yahoo" | "binance" | "polygon";

export interface MarketDataProvider {
  readonly provider: MarketDataSource;

  fetchCandles(params: {
    asset: Asset;
    timeframe: MarketTimeframe;
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<CandleDomainModel[]>;

  fetchLatestPrice(params: {
    asset: Asset;
    timeframe?: MarketTimeframe;
  }): Promise<number | null>;
}
