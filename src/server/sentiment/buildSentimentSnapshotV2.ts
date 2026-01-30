import { normalizeSentimentRawToSnapshot } from "@/src/domain/sentiment/normalizeSentiment";
import { mergeSentimentSnapshots } from "@/src/domain/sentiment/mergeSentimentSnapshots";
import type { SentimentSnapshotV2, SentimentWindow } from "@/src/domain/sentiment/types";
import type { SentimentSourceConfig, SentimentSourceId } from "@/src/server/sentiment/sentimentSources";

type FetchRaw = (sourceId: SentimentSourceId) => Promise<unknown>;

export type BuildSentimentSnapshotResult = {
  snapshot: SentimentSnapshotV2;
  warnings: string[];
  perSource: Record<string, { warnings: string[]; ok: boolean }>;
};

export async function buildSentimentSnapshotV2(params: {
  assetId: string;
  asOf: Date;
  lookbackHours: number;
  sources: ReadonlyArray<SentimentSourceConfig>;
  fetchRawBySource: FetchRaw;
}): Promise<BuildSentimentSnapshotResult> {
  const asOfIso = params.asOf.toISOString();
  const from = new Date(params.asOf.getTime() - params.lookbackHours * 60 * 60 * 1000);
  const window: SentimentWindow = {
    fromIso: from.toISOString(),
    toIso: asOfIso,
    granularity: "1H",
  };

  const warnings: string[] = [];
  const perSource: Record<string, { warnings: string[]; ok: boolean }> = {};
  const mergeInputs: { snapshot: SentimentSnapshotV2; sourceId: SentimentSourceId; weight: number }[] = [];

  for (const source of params.sources) {
    if (!source.enabled) {
      perSource[source.sourceId] = { ok: false, warnings: ["disabled"] };
      continue;
    }
    try {
      const raw = await params.fetchRawBySource(source.sourceId);
      const normalized = normalizeSentimentRawToSnapshot(raw, {
        assetId: params.assetId,
        asOfIso,
        window,
      });
      mergeInputs.push({
        snapshot: {
          ...normalized.snapshot,
          sources: [
            {
              sourceId: source.sourceId,
              weight: source.weight,
              updatedAtIso: normalized.snapshot.asOfIso ?? asOfIso,
            },
          ],
          raw,
        },
        sourceId: source.sourceId,
        weight: source.weight,
      });
      if (normalized.warnings.length) {
        perSource[source.sourceId] = { ok: true, warnings: normalized.warnings };
      } else {
        perSource[source.sourceId] = { ok: true, warnings: [] };
      }
    } catch (error) {
      const msg = `fetch failed: ${String(error)}`;
      perSource[source.sourceId] = { ok: false, warnings: [msg] };
      warnings.push(msg);
    }
  }

  if (mergeInputs.length === 0) {
    const fallback: SentimentSnapshotV2 = {
      assetId: params.assetId,
      asOfIso,
      window,
      sources: params.sources
        .filter((s) => s.enabled)
        .map((s) => ({ sourceId: s.sourceId, weight: s.weight, updatedAtIso: asOfIso })),
      components: { polarityScore: 0, confidence: 0 },
      meta: { warnings: "all sources failed" },
    };
    return { snapshot: fallback, warnings, perSource };
  }

  const merged = mergeSentimentSnapshots(mergeInputs, { assetId: params.assetId, asOfIso, window });
  if (merged.warnings.length) warnings.push(...merged.warnings);

  return {
    snapshot: merged.combined,
    warnings,
    perSource,
  };
}
