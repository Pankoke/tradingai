import type { CandleDomainModel } from "@/src/server/providers/marketDataProvider";
import type { Asset } from "@/src/server/repositories/assetRepository";

export type MarketTimeframe = "1D" | "4H" | "1H" | "15m" | "1W";

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

export function mapAssetSymbolToBinance(symbol?: string | null): string | null {
  if (!symbol) {
    return null;
  }
  const upper = symbol.toUpperCase();
  if (upper.endsWith("USDT")) {
    return upper.replace(/[^A-Z0-9]/g, "");
  }

  const normalized = upper.replace(/[^A-Z0-9]/g, "");
  if (normalized.endsWith("USD")) {
    const base = normalized.slice(0, -3);
    if (!base) {
      return null;
    }
    return `${base}USDT`;
  }

  return null;
}
