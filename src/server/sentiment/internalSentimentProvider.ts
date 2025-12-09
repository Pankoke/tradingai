import type { Asset } from "@/src/server/repositories/assetRepository";
import type {
  SentimentProvider,
  SentimentProviderDebug,
  SentimentRawSnapshot,
} from "./SentimentProvider";

export class InternalSentimentProvider implements SentimentProvider {
  public readonly source = "internal" as const;
  private lastDebug: SentimentProviderDebug | null = null;

  async fetchSentiment(params: { asset: Asset }): Promise<SentimentRawSnapshot | null> {
    this.lastDebug = {
      requestedSymbol: params.asset.symbol,
      timestamp: new Date().toISOString(),
      message: "internal fallback sentiment",
    };

    return {
      assetId: params.asset.id,
      symbol: params.asset.symbol,
      fundingRate: null,
      openInterestUsd: null,
      openInterestChangePct: null,
      longLiquidationsUsd: null,
      shortLiquidationsUsd: null,
      longShortRatio: null,
      fundingRateAnnualized: null,
      source: this.source,
      timestamp: new Date(),
    };
  }

  getLastDebug(): SentimentProviderDebug | null {
    return this.lastDebug;
  }
}
