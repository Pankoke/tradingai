import type { SentimentProviderPort } from "@/src/domain/sentiment/ports";
import type { SentimentSnapshotV2, SentimentWindow } from "@/src/domain/sentiment/types";
import { normalizeSentimentRawToSnapshot } from "@/src/domain/sentiment/normalizeSentiment";
import { buildSentimentMetrics } from "@/src/lib/engine/sentimentMetrics";
import { getAssetById } from "@/src/server/repositories/assetRepository";
import { resolveSentimentProvider } from "@/src/server/sentiment/providerResolver";
import { SENTIMENT_SOURCES, toSourceRef } from "@/src/server/sentiment/sentimentSources";
import { buildSentimentSnapshotV2 } from "@/src/server/sentiment/buildSentimentSnapshotV2";

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

    const enabledSources = SENTIMENT_SOURCES.filter((s) => s.enabled);
    if (!provider || enabledSources.length === 0) {
      return {
        assetId: params.assetId,
        asOfIso,
        window,
        sources: enabledSources.map((s) => toSourceRef(s, asOfIso)),
        components: { polarityScore: 0, confidence: 0 },
        meta: { warnings: "no provider or no enabled sources" },
      };
    }

    const built = await buildSentimentSnapshotV2({
      assetId: params.assetId,
      asOf: params.asOf,
      lookbackHours: 24,
      sources: SENTIMENT_SOURCES,
      fetchRawBySource: async () => provider.fetchSentiment({ asset }),
    });

    const metrics = buildSentimentMetrics({ asset, sentiment: built.snapshot });
    const confidence = metrics.flags?.includes("low_conviction") ? 0.25 : 0.75;
    const flagsStr = metrics.flags?.length ? metrics.flags.join(",") : undefined;
    const warningsBySource = Object.keys(built.perSource).length ? built.perSource : undefined;

    return {
      ...built.snapshot,
      components: {
        ...built.snapshot.components,
        // keep compatibility with engine scoring (score ~ [-1,1])
        polarityScore: metrics.score ? (metrics.score - 50) / 50 : built.snapshot.components.polarityScore,
        confidence: confidence ?? built.snapshot.components.confidence,
      },
      meta: {
        ...(built.snapshot.meta ?? {}),
        label: metrics.label,
        ...(flagsStr ? { flags: flagsStr } : {}),
        ...(built.warnings.length ? { warnings: built.warnings.join(",") } : {}),
        ...(warningsBySource ? { warningsBySourceJson: JSON.stringify(warningsBySource) } : {}),
      },
      raw: null,
    };
  }
}
