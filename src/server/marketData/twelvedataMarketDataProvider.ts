import type { CandleDomainModel } from "@/src/server/providers/marketDataProvider";
import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketDataProvider, MarketTimeframe } from "./MarketDataProvider";
import { getThrottler } from "@/src/server/marketData/requestThrottler";

const BASE_URL = process.env.TWELVEDATA_API_KEY
  ? "https://api.twelvedata.com/time_series"
  : "";
const API_KEY = process.env.TWELVEDATA_API_KEY;

function intervalForTf(tf: MarketTimeframe): string {
  switch (tf) {
    case "1H":
      return "1h";
    case "4H":
      return "4h";
    case "15m":
      return "15min";
    case "1W":
      return "1week";
    case "1D":
    default:
      return "1day";
  }
}

type TwelveDataResponse = {
  values?: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume?: string;
  }>;
  status?: string;
  message?: string;
};

function mapAssetToTwelveDataSymbol(asset: Asset): string | null {
  const upper = (asset.symbol ?? "").toUpperCase();
  const upperId = (asset.id ?? "").toUpperCase();
  if (asset.assetClass === "crypto") {
    if (upper.includes("BTC")) return "BTC/USD";
    if (upper.includes("ETH")) return "ETH/USD";
  }
  if (upper === "GC=F" || upper === "GOLD" || upper === "XAUUSD" || upper === "XAUUSD=X" || upperId === "GOLD") {
    return "XAU/USD";
  }
  if (upper === "SI=F" || upper === "SILVER" || upperId === "SILVER") {
    return "XAG/USD";
  }
  if (upper === "CL=F" || upper === "WTI" || upperId === "WTI") {
    return "WTI/USD";
  }
  if (upper === "GBPUSD=X" || upper === "GBPUSD" || upperId === "GBPUSD") {
    return "GBP/USD";
  }
  if (upper === "USDJPY=X" || upper === "USDJPY" || upperId === "USDJPY") {
    return "USD/JPY";
  }
  if (upper === "EURUSD=X" || upper === "EURUSD" || upperId === "EURUSD") {
    return "EUR/USD";
  }
  if (upper === "EURJPY=X" || upper === "EURJPY" || upperId === "EURJPY") {
    return "EUR/JPY";
  }
  // TODO: extend mapping for FX/indices/commodities as they are enabled
  return null;
}

export class TwelveDataMarketDataProvider implements MarketDataProvider {
  public readonly provider = "twelvedata" as const;

  async fetchCandles(params: {
    asset: Asset;
    timeframe: MarketTimeframe;
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<CandleDomainModel[]> {
    if (!API_KEY || !BASE_URL) {
      console.warn("[TwelveDataMarketDataProvider] API key missing, skipping fetch");
      return [];
    }
    const throttler = getThrottler(this.provider);
    const interval = intervalForTf(params.timeframe);
    const mappedSymbol = mapAssetToTwelveDataSymbol(params.asset);
    if (!mappedSymbol) {
      console.warn("[TwelveDataMarketDataProvider] missing symbol mapping", {
        assetId: params.asset.id,
        symbol: params.asset.symbol,
        timeframe: params.timeframe,
      });
      return [];
    }
    const url = new URL(BASE_URL);
    url.searchParams.set("symbol", mappedSymbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("apikey", API_KEY);
    url.searchParams.set("start_date", params.from.toISOString());
    url.searchParams.set("end_date", params.to.toISOString());
    url.searchParams.set("outputsize", String(params.limit ?? 500));

    try {
      const response = await throttler.fetch(url.toString(), { cache: "no-store" });
      if (response.status === 429) {
        console.warn("[TwelveDataMarketDataProvider] rate limited");
        return [];
      }
      if (!response.ok) {
        const body = await response.text();
        console.warn(
          "[TwelveDataMarketDataProvider] request failed",
          {
            status: response.status,
            url: url.toString(),
            symbol: params.asset.symbol,
            timeframe: params.timeframe,
            body: body.slice(0, 200),
          },
        );
        return [];
      }
      const payload = (await response.json()) as TwelveDataResponse;
      const values = payload.values ?? [];
      if (!values.length) return [];
      return values.map((v) => ({
        assetId: params.asset.id,
        timeframe: params.timeframe,
        timestamp: new Date(v.datetime),
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: v.volume ? Number(v.volume) : undefined,
        source: this.provider,
      }));
    } catch (error) {
      console.warn("[TwelveDataMarketDataProvider] error fetching", {
        symbol: params.asset.symbol,
        timeframe: params.timeframe,
        error,
      });
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
