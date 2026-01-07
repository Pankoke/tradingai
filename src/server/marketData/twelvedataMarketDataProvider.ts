import type { CandleDomainModel } from "@/src/server/providers/marketDataProvider";
import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketDataProvider, MarketTimeframe } from "./MarketDataProvider";

const BASE_URL = process.env.TWELVEDATA_API_KEY
  ? "https://api.twelvedata.com/time_series"
  : "";
const API_KEY = process.env.TWELVEDATA_API_KEY;
const RATE_LIMIT_PER_MINUTE = 8;

let windowStart = 0;
let requestCount = 0;

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

function allowRequest(): boolean {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    requestCount = 0;
  }
  if (requestCount >= RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  requestCount += 1;
  return true;
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
    if (!allowRequest()) {
      console.warn("[TwelveDataMarketDataProvider] rate limit window reached, skipping fetch");
      return [];
    }

    const interval = intervalForTf(params.timeframe);
    const url = new URL(BASE_URL);
    url.searchParams.set("symbol", params.asset.symbol.toUpperCase());
    url.searchParams.set("interval", interval);
    url.searchParams.set("apikey", API_KEY);
    url.searchParams.set("start_date", params.from.toISOString());
    url.searchParams.set("end_date", params.to.toISOString());
    url.searchParams.set("outputsize", String(params.limit ?? 500));

    try {
      const response = await fetch(url, { cache: "no-store" });
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
