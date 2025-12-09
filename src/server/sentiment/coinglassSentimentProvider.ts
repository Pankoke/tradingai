import type { Asset } from "@/src/server/repositories/assetRepository";
import type { SentimentProvider, SentimentRawSnapshot } from "./SentimentProvider";

const COINGLASS_API_KEY = process.env.COINGLASS_API_KEY;
const COINGLASS_BASE_URL = process.env.COINGLASS_API_BASE_URL ?? "https://open-api.coinglass.com";

type CoinglassFundingRow = {
  symbol: string;
  fundingRate?: number;
  fundingRate7d?: number;
  fundingRateAnnualized?: number;
  openInterest?: number;
  openInterestValue?: number;
  openInterestChange?: number;
  openInterestChange24h?: number;
  longLiquidation?: number;
  shortLiquidation?: number;
  timestamp?: number;
};

type CoinglassFundingResponse = {
  code: number;
  msg?: string;
  data?: CoinglassFundingRow[];
};

function mapSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.endsWith("USDT")) {
    return upper.slice(0, -4);
  }
  if (upper.endsWith("USD")) {
    return upper.slice(0, -3);
  }
  return upper;
}

export class CoinglassSentimentProvider implements SentimentProvider {
  public readonly source = "coinglass" as const;

  isEnabled(): boolean {
    return Boolean(COINGLASS_API_KEY);
  }

  async fetchFundingAndOi(params: { asset: Asset }): Promise<SentimentRawSnapshot | null> {
    if (!this.isEnabled()) {
      return null;
    }

    if (params.asset.assetClass !== "crypto") {
      return null;
    }

    const symbol = mapSymbol(params.asset.symbol);
    const url = new URL("/api/pro/v1/futures/fundingRate", COINGLASS_BASE_URL);
    url.searchParams.set("symbol", symbol);

    try {
      const response = await fetch(url, {
        headers: {
          "coinglassSecret": COINGLASS_API_KEY ?? "",
        },
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        console.warn(`[CoinglassSentimentProvider] request failed (${response.status}) for ${symbol}`);
        return null;
      }

      const payload = (await response.json()) as CoinglassFundingResponse;
      const row = payload.data?.[0];
      if (!row) {
        console.warn(`[CoinglassSentimentProvider] empty data for ${symbol}`);
        return null;
      }

      return {
        assetId: params.asset.id,
        symbol: params.asset.symbol,
        fundingRate: row.fundingRate ?? null,
        fundingRateAnnualized: row.fundingRateAnnualized ?? null,
        openInterestUsd: row.openInterestValue ?? null,
        openInterestChangePct: row.openInterestChange24h ?? row.openInterestChange ?? null,
        longLiquidationsUsd: row.longLiquidation ?? null,
        shortLiquidationsUsd: row.shortLiquidation ?? null,
        source: this.source,
        timestamp: row.timestamp ? new Date(row.timestamp) : new Date(),
      } satisfies SentimentRawSnapshot;
    } catch (error) {
      console.warn(`[CoinglassSentimentProvider] error fetching ${symbol}`, error);
      return null;
    }
  }
}
