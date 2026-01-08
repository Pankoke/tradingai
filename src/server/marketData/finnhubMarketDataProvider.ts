import type { CandleDomainModel } from "@/src/server/providers/marketDataProvider";
import type { Asset } from "@/src/server/repositories/assetRepository";
import type { MarketDataProvider, MarketTimeframe } from "./MarketDataProvider";
import { getThrottler } from "@/src/server/marketData/requestThrottler";

type FinnhubResolution = "60" | "240" | "15" | "D" | "W";

type FinnhubCandleResponse = {
  s: "ok" | "no_data";
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
  error?: string;
};

class FinnhubRateLimitError extends Error {
  constructor(message = "finnhub_rate_limited") {
    super(message);
    this.name = "FinnhubRateLimitError";
  }
}

function timeframeToResolution(tf: MarketTimeframe): FinnhubResolution {
  if (tf === "1H") return "60";
  if (tf === "4H") return "240";
  if (tf === "15m") return "15";
  if (tf === "1W") return "W";
  return "D";
}

function mapAssetToFinnhubSymbol(asset: Asset): string | null {
  const symbol = (asset.symbol ?? "").toUpperCase();
  const id = (asset.id ?? "").toUpperCase();

  // Crypto via Binance pairs
  if (asset.assetClass === "crypto") {
    if (symbol.includes("BTC")) return "BINANCE:BTCUSDT";
    if (symbol.includes("ETH")) return "BINANCE:ETHUSDT";
    return null;
  }

  // Gold / commodities
  if (id === "GOLD" || symbol === "GC=F" || symbol === "XAUUSD" || symbol === "XAUUSD=X") {
    return "OANDA:XAUUSD";
  }

  // FX (basic)
  if (symbol.includes("/")) {
    return symbol.replace("/", "");
  }

  // Indices/Equities fallback: try as-is
  return symbol || id || null;
}

export class FinnhubMarketDataProvider implements MarketDataProvider {
  public readonly provider = "finnhub" as const;

  async fetchCandles(params: {
    asset: Asset;
    timeframe: MarketTimeframe;
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<CandleDomainModel[]> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      console.warn("[Finnhub] FINNHUB_API_KEY missing, skipping fetch");
      return [];
    }

    const mapped = mapAssetToFinnhubSymbol(params.asset);
    if (!mapped) {
      console.warn("[Finnhub] missing symbol mapping", { assetId: params.asset.id, symbol: params.asset.symbol });
      return [];
    }

    const resolution = timeframeToResolution(params.timeframe);
    const url = new URL("https://finnhub.io/api/v1/forex/candle");
    url.searchParams.set("symbol", mapped);
    url.searchParams.set("resolution", resolution);
    url.searchParams.set("from", Math.floor(params.from.getTime() / 1000).toString());
    url.searchParams.set("to", Math.floor(params.to.getTime() / 1000).toString());
    url.searchParams.set("token", apiKey);

    const throttler = getThrottler(this.provider);
    const response = await throttler.fetch(url.toString(), { cache: "no-store" });
    if (response.status === 429) {
      throw new FinnhubRateLimitError();
    }
    if (!response.ok) {
      const body = await response.text();
      console.warn("[Finnhub] request failed", { status: response.status, body: body.slice(0, 200) });
      return [];
    }

    const payload = (await response.json()) as FinnhubCandleResponse;
    if (payload.s !== "ok" || !payload.t || !payload.o || !payload.h || !payload.l || !payload.c) {
      return [];
    }

    const hasVolume = Array.isArray(payload.v);
    const candles: CandleDomainModel[] = [];
    for (let i = 0; i < payload.t.length; i += 1) {
      const ts = payload.t[i];
      const open = payload.o[i];
      const high = payload.h[i];
      const low = payload.l[i];
      const close = payload.c[i];
      if ([ts, open, high, low, close].some((v) => v === undefined || v === null)) {
        continue;
      }
      candles.push({
        assetId: params.asset.id,
        timeframe: params.timeframe,
        timestamp: new Date(ts * 1000),
        open,
        high,
        low,
        close,
        volume: hasVolume ? payload.v?.[i] : undefined,
        source: this.provider,
      });
    }
    return candles;
  }

  async fetchLatestPrice(params: { asset: Asset; timeframe?: MarketTimeframe }): Promise<number | null> {
    const now = new Date();
    const tf = params.timeframe ?? "1H";
    const from = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const candles = await this.fetchCandles({
      asset: params.asset,
      timeframe: tf,
      from,
      to: now,
      limit: 1,
    });
    const latest = candles.at(-1);
    return latest ? latest.close : null;
  }
}

export { FinnhubRateLimitError };
