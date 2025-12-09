import type { Asset } from "@/src/server/repositories/assetRepository";
import type {
  SentimentContext,
  SentimentProvider,
  SentimentProviderDebug,
  SentimentRawSnapshot,
} from "./SentimentProvider";

export class InternalSentimentProvider implements SentimentProvider {
  public readonly source = "internal" as const;
  private lastDebug: SentimentProviderDebug | null = null;

  async fetchSentiment(params: {
    asset: Asset;
    context?: SentimentContext;
  }): Promise<SentimentRawSnapshot | null> {
    const snapshot: SentimentRawSnapshot = {
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
      biasScore: params.context?.biasScore,
      trendScore: params.context?.trendScore,
      momentumScore: params.context?.momentumScore,
      orderflowScore: params.context?.orderflowScore,
      eventScore: params.context?.eventScore,
      rrr: params.context?.rrr,
      riskPercent: params.context?.riskPercent,
      volatilityLabel: params.context?.volatilityLabel,
      driftPct: params.context?.driftPct,
    };

    this.lastDebug = {
      requestedSymbol: params.asset.symbol,
      timestamp: snapshot.timestamp.toISOString(),
      message: "internal heuristic snapshot generated",
      contextIncluded: Boolean(params.context),
    };

    return snapshot;
  }

  getLastDebug(): SentimentProviderDebug | null {
    return this.lastDebug;
  }
}
