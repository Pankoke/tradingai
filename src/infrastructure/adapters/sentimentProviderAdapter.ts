import type { SentimentProviderPort } from "@/src/domain/sentiment/ports";
import type { SentimentSnapshot } from "@/src/domain/sentiment/types";
import { buildSentimentMetrics } from "@/src/lib/engine/sentimentMetrics";
import { getAssetById } from "@/src/server/repositories/assetRepository";
import { resolveSentimentProvider } from "@/src/server/sentiment/providerResolver";

export class SentimentProviderAdapter implements SentimentProviderPort {
  async fetchSentiment(params: { assetId: string; asOf: Date }): Promise<SentimentSnapshot> {
    const asset = await getAssetById(params.assetId);
    if (!asset) {
      return {
        assetId: params.assetId,
        asOf: params.asOf,
        score: 0,
        confidence: 0,
        flags: ["low_conviction"],
        contributions: [],
        raw: null,
      };
    }

    const provider = resolveSentimentProvider(asset);
    const raw = provider ? await provider.fetchSentiment({ asset }) : null;
    const normalizedRaw = raw
      ? { ...raw, timestamp: raw.timestamp ? new Date(raw.timestamp).toISOString() : undefined }
      : null;

    const metrics = buildSentimentMetrics({ asset, sentiment: normalizedRaw });
    const confidence = metrics.flags?.includes("low_conviction") ? 0.25 : 0.75;

    return {
      assetId: params.assetId,
      asOf: params.asOf,
      score: metrics.score,
      label: metrics.label,
      contributions: metrics.contributions,
      flags: metrics.flags,
      confidence,
      raw: metrics.raw ?? raw ?? null,
    };
  }
}
