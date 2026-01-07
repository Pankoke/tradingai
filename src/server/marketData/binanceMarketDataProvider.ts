import type { CandleDomainModel } from "@/src/server/providers/marketDataProvider";
import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketDataProvider, MarketTimeframe } from "./MarketDataProvider";
import { resolvePreferredSource } from "./assetProviderMapping";

const BINANCE_API_BASE_URL = process.env.BINANCE_API_BASE_URL ?? "https://api.binance.com";

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  string,
  string,
  string,
  string
];

function mapTimeframeToBinanceInterval(tf: MarketTimeframe): string {
  switch (tf) {
    case "1D":
      return "1d";
    case "1W":
      return "1w";
    case "4H":
      return "4h";
    case "1H":
      return "1h";
    case "15m":
      return "15m";
    default:
      return "1d";
  }
}

export class BinanceMarketDataProvider implements MarketDataProvider {
  public readonly provider = "binance" as const;

  async fetchCandles(params: {
    asset: Asset;
    timeframe: MarketTimeframe;
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<CandleDomainModel[]> {
    if (params.asset.assetClass !== "crypto") {
      return [];
    }

    const interval = mapTimeframeToBinanceInterval(params.timeframe);
    const { providerSymbol } = resolvePreferredSource(params.asset);
    const symbol = providerSymbol;
    const limit = params.limit ?? 500;

    const url = new URL("/api/v3/klines", BINANCE_API_BASE_URL);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("startTime", String(params.from.getTime()));
    url.searchParams.set("endTime", String(params.to.getTime()));

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[BinanceMarketDataProvider] request failed for ${symbol}: ${response.status}`, {
          status: response.status,
          url: url.toString(),
          symbol,
          timeframe: params.timeframe,
        });
        return [];
      }

      const payload = (await response.json()) as BinanceKline[];
      return payload.map((kline) => ({
        assetId: params.asset.id,
        timeframe: params.timeframe,
        timestamp: new Date(kline[0]),
        open: Number(kline[1]),
        high: Number(kline[2]),
        low: Number(kline[3]),
        close: Number(kline[4]),
        volume: Number(kline[5]),
        source: this.provider,
      }));
    } catch (error) {
      console.warn(`[BinanceMarketDataProvider] error fetching ${symbol}`, error);
      return [];
    }
  }

  async fetchLatestPrice(params: { asset: Asset; timeframe?: MarketTimeframe }): Promise<number | null> {
    const now = new Date();
    const from = new Date(now.getTime() - 60 * 60 * 1000);
    const candles = await this.fetchCandles({
      asset: params.asset,
      timeframe: params.timeframe ?? "1H",
      from,
      to: now,
      limit: 1,
    });
    const latest = candles.at(-1);
    return latest ? latest.close : null;
  }
}
