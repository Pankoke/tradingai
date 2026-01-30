import type { SentimentProviderPort } from "@/src/domain/sentiment/ports";
import type { SentimentSnapshotV2, SentimentWindow } from "@/src/domain/sentiment/types";
import { normalizeSentimentRawToSnapshot } from "@/src/domain/sentiment/normalizeSentiment";
import { buildSentimentMetrics } from "@/src/lib/engine/sentimentMetrics";
import { getAssetById } from "@/src/server/repositories/assetRepository";
import { resolveSentimentProvider } from "@/src/server/sentiment/providerResolver";
import { pickPrimarySource, toSourceRef } from "@/src/server/sentiment/sentimentSources";

export class SentimentProviderAdapter implements SentimentProviderPort {
  async fetchSentiment(params: { assetId: string; asOf: Date }): Promise<SentimentSnapshotV2> {
    const asset = await getAssetById(params.assetId);
    if (!asset) {
      const asOfIso = params.asOf.toISOString();
      const window: SentimentWindow = {
        fromIso: asOfIso,
        toIso: asOfIso,
      };
      return {
        assetId: params.assetId,
        asOfIso,
        window,
        sources: [{ sourceId: "unknown", updatedAtIso: asOfIso }],
        components: { polarityScore: 0, confidence: 0 },
        meta: { flags: "low_conviction" },
      };
    }

    const provider = resolveSentimentProvider(asset);
    const asOfIso = params.asOf.toISOString();
    const window: SentimentWindow = {
      fromIso: new Date(params.asOf.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24h lookback
      toIso: asOfIso,
      granularity: "1H",
    };

    const raw = provider ? await provider.fetchSentiment({ asset }) : null;
    const normalized = normalizeSentimentRawToSnapshot(raw, {
      assetId: params.assetId,
      asOfIso,
      window,
    });

    const metrics = buildSentimentMetrics({ asset, sentiment: normalized.snapshot });
    const confidence = metrics.flags?.includes("low_conviction") ? 0.25 : 0.75;

    const flagsStr = metrics.flags?.length ? metrics.flags.join(",") : undefined;
    const primarySource = pickPrimarySource();
    const sources = primarySource
      ? [toSourceRef(primarySource, asOfIso)]
      : normalized.snapshot.sources;

    return {
      ...normalized.snapshot,
      sources,
      components: {
        ...normalized.snapshot.components,
        // keep compatibility with engine scoring (score ~ [-1,1])
        polarityScore: metrics.score ? (metrics.score - 50) / 50 : normalized.snapshot.components.polarityScore,
        confidence: confidence ?? normalized.snapshot.components.confidence,
      },
      meta: {
        ...(normalized.snapshot.meta ?? {}),
        label: metrics.label,
        ...(flagsStr ? { flags: flagsStr } : {}),
        ...(normalized.warnings.length ? { warnings: normalized.warnings.join(",") } : {}),
      },
      raw: raw ?? null,
    };
  }
}
