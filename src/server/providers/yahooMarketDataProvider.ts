import type { CandleDomainModel } from "./marketDataProvider";
import type { MarketDataProvider, MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import type { Asset } from "@/src/server/repositories/assetRepository";

const YAHOO_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";

type YahooQuote = {
  open?: number[];
  high?: number[];
  low?: number[];
  close?: number[];
  volume?: number[];
};

type YahooChartResponse = {
  chart?: {
    result?: [
      {
        timestamp?: number[];
        indicators?: {
          quote?: YahooQuote[];
        };
      }
    ];
    error?: {
      code: string;
      description: string;
    } | null;
  };
};

export class YahooMarketDataProvider implements MarketDataProvider {
  public readonly provider = "yahoo" as const;

  async fetchCandles(params: {
    asset: Asset;
    timeframe: MarketTimeframe;
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<CandleDomainModel[]> {
    if (params.timeframe !== "1D") {
      return [];
    }

    const fromEpoch = Math.floor(params.from.getTime() / 1000);
    const toEpoch = Math.floor(params.to.getTime() / 1000);
    const url = new URL(`${YAHOO_ENDPOINT}/${encodeURIComponent(params.asset.symbol)}`);
    url.searchParams.set("interval", "1d");
    url.searchParams.set("period1", String(fromEpoch));
    url.searchParams.set("period2", String(toEpoch));

    const response = await fetch(url, {});
    if (!response.ok) {
      return [];
    }

    const payload: YahooChartResponse = await response.json();
    const result = payload.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp ?? [];

    if (!quote || !timestamps.length) {
      return [];
    }

    const count = Math.min(
      timestamps.length,
      quote.open?.length ?? 0,
      quote.high?.length ?? 0,
      quote.low?.length ?? 0,
      quote.close?.length ?? 0
    );

    const candles: CandleDomainModel[] = [];
    for (let i = 0; i < count; i += 1) {
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];
      if (
        open == null ||
        high == null ||
        low == null ||
        close == null
      ) {
        continue;
      }

      candles.push({
        assetId: params.asset.id,
        timeframe: params.timeframe,
        timestamp: new Date((timestamps[i] ?? 0) * 1000),
        open,
        high,
        low,
        close,
        volume: quote.volume?.[i],
        source: "yahoo",
      });
    }

    return candles;
  }

  async fetchLatestPrice(params: { asset: Asset; timeframe?: MarketTimeframe }): Promise<number | null> {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 2);

    const candles = await this.fetchCandles({
      asset: params.asset,
      timeframe: params.timeframe ?? "1D",
      from,
      to,
      limit: 1,
    });

    const latest = candles.at(-1);
    return latest ? latest.close : null;
  }
}
