import { buildSentimentSnapshotV2 } from "@/src/server/sentiment/buildSentimentSnapshotV2";
import type { BuildSentimentSnapshotResult } from "@/src/server/sentiment/buildSentimentSnapshotV2";
import { SENTIMENT_SOURCES } from "@/src/server/sentiment/sentimentSources";
import { upsertSentimentSnapshot, unknownSentimentWriteResult } from "@/src/server/repositories/sentimentSnapshotRepository";
import type { WriteResult } from "@/src/domain/shared/writeResult";
import { resolveSentimentProvider } from "@/src/server/sentiment/providerResolver";
import { getAssetById } from "@/src/server/repositories/assetRepository";

export type SentimentBackfillChunk = {
  asOfIso: string;
  fromIso: string;
  toIso: string;
  ok: boolean;
  writeResult: WriteResult;
  warnings: string[];
  error?: string;
};

export type SentimentBackfillResult =
  | {
      ok: true;
      assetId: string;
      processed: number;
      upserted: number | null;
      inserted: number | null;
      updated: number | null;
      chunks: SentimentBackfillChunk[];
      warnings: string[];
    }
  | { ok: false; error: string; code: string };

const DEFAULT_STEP_HOURS = 4;
const DEFAULT_LOOKBACK_HOURS = 24;

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export async function backfillSentimentSnapshots(params: {
  assetId: string;
  fromIso: string;
  toIso: string;
  stepHours?: number;
  lookbackHours?: number;
  buildFn?: (assetId: string, asOf: Date) => Promise<BuildSentimentSnapshotResult>;
  upsertFn?: (snapshot: BuildSentimentSnapshotResult["snapshot"]) => Promise<WriteResult>;
}): Promise<SentimentBackfillResult> {
  const from = new Date(params.fromIso);
  const to = new Date(params.toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return { ok: false, error: "Invalid from/to range", code: "invalid_range" };
  }

  const asset = await getAssetById(params.assetId);
  if (!asset) {
    return { ok: false, error: "Asset not found", code: "asset_not_found" };
  }

  const buildFn =
    params.buildFn ??
    (async (assetId: string, asOf: Date) => {
      const provider = resolveSentimentProvider(asset);
      return buildSentimentSnapshotV2({
        assetId,
        asOf,
        lookbackHours: params.lookbackHours ?? DEFAULT_LOOKBACK_HOURS,
        sources: SENTIMENT_SOURCES,
        fetchRawBySource: async () => provider?.fetchSentiment({ asset }) ?? null,
      });
    });

  const upsertFn = params.upsertFn ?? upsertSentimentSnapshot;
  const stepHours = params.stepHours ?? DEFAULT_STEP_HOURS;

  const chunks: SentimentBackfillChunk[] = [];
  let cursor = new Date(from);
  let inserted = 0;
  let updated = 0;
  const warnings: string[] = [];

  while (cursor <= to) {
    const asOf = new Date(cursor);
    try {
      const built = await buildFn(params.assetId, asOf);
      const result = await upsertFn(built.snapshot);
      inserted += result.inserted ?? 0;
      updated += result.updated ?? 0;
      chunks.push({
        asOfIso: built.snapshot.asOfIso,
        fromIso: built.snapshot.window.fromIso,
        toIso: built.snapshot.window.toIso,
        ok: true,
        writeResult: result,
        warnings: [...built.warnings],
      });
      if (built.warnings.length) {
        warnings.push(...built.warnings.map((w) => `${built.snapshot.asOfIso}: ${w}`));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      chunks.push({
        asOfIso: asOf.toISOString(),
        fromIso: asOf.toISOString(),
        toIso: asOf.toISOString(),
        ok: false,
        writeResult: unknownSentimentWriteResult("build_failed"),
        warnings: [],
        error: message,
      });
      warnings.push(`${asOf.toISOString()}: ${message}`);
    }
    cursor = addHours(cursor, stepHours);
  }

  const processed = chunks.length;
  const anySuccess = chunks.some((c) => c.ok);
  if (!anySuccess) {
    return { ok: false, error: "All chunks failed", code: "all_failed" };
  }

  return {
    ok: true,
    assetId: params.assetId,
    processed,
    inserted,
    updated,
    upserted: inserted + updated,
    chunks,
    warnings,
  };
}
