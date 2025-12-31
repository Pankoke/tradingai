import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { runOutcomeEvaluationBatch } from "@/src/server/services/outcomeEvaluationRunner";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const params = request.nextUrl.searchParams;
  const daysBack = parseInt(params.get("daysBack") ?? "730", 10);
  const limitSetups = Math.min(2000, Math.max(1, parseInt(params.get("limitSetups") ?? "200", 10)));
  const dryRun = parseBool(params.get("dryRun") ?? params.get("dry_run") ?? "false");
  const assetId = params.get("assetId") ?? undefined;
  const playbookId = params.get("playbookId") ?? undefined;
  const debug = parseBool(params.get("debug") ?? "false");
  const appliedAssetFilter = resolveAssetIds(assetId);

  const started = Date.now();
  try {
    const result = await runOutcomeEvaluationBatch({
      daysBack,
      limit: limitSetups,
      dryRun,
      assetId,
      playbookId,
      loggerInfo: debug,
    });
    const durationMs = Date.now() - started;
    const topReasons = Object.entries(result.reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));
    await createAuditRun({
      action: "outcomes.backfill",
      source: "cron",
      ok: true,
      durationMs,
      message: "outcomes_backfill",
      meta: {
        daysBack,
        limitSetups,
        dryRun,
        processed: result.processed,
        metrics: result.metrics,
        inserted: result.inserted,
        updated: result.updated,
        unchanged: result.unchanged,
      },
    });

    const goldReasonTop = topEntries(result.goldReasonCounts ?? {}, 10);
    const goldSampleSetups = [...(result.goldSampleIneligible ?? []), ...(result.goldSampleEligible ?? [])].slice(0, 10);

    return respondOk({
      processed: result.processed,
      evaluated: result.metrics.evaluated,
      written: dryRun ? 0 : result.inserted + result.updated,
      inserted: dryRun ? 0 : result.inserted,
      updated: dryRun ? 0 : result.updated,
      unchanged: result.unchanged,
      skippedClosed: result.metrics.skippedClosed,
      errors: result.metrics.errors,
      durationMs,
      nextCursor: null,
      ...(debug
        ? {
            snapshotsLoaded: result.stats.snapshots,
            setupsExtracted: result.stats.extractedSetups,
            eligible: result.stats.eligible,
            eligibleTotal: result.stats.eligible,
            closedCounts: {
              hit_tp: result.metrics.hit_tp,
              hit_sl: result.metrics.hit_sl,
              expired: result.metrics.expired,
              ambiguous: result.metrics.ambiguous,
              open: result.metrics.still_open,
            },
            topNotEligibleReasons: topReasons,
            reasonSamples: result.reasonSamples,
            sampleSetupIds: result.sampleSetupIds,
            appliedAssetFilter: appliedAssetFilter ?? null,
            topMismatchedAssets: topEntries(result.mismatchedAssets, 10),
            topMismatchedPlaybooks: topEntries(result.mismatchedPlaybooks, 10),
            assetMatchField: "assetId_or_symbol",
            playbookMatchStats: result.playbookMatchStats,
            effectivePlaybookSample: result.effectivePlaybookSamples,
            goldStats: result.goldStats,
            goldEligibilityDebug: {
              extracted: result.goldStats.extracted,
              eligible: result.goldStats.eligible,
              ineligible: Math.max(0, result.goldStats.extracted - result.goldStats.eligible),
              topNotEligibleReasons: goldReasonTop,
              reasonSamples: result.goldReasonSamples ?? {},
              sampleSetups: goldSampleSetups,
            },
          }
        : {}),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    return respondFail("INTERNAL_ERROR", msg, 500);
  }
}

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token === CRON_SECRET) return true;
  }
  return false;
}

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true" || value === "1";
  return false;
}

function resolveAssetIds(assetId?: string | null): string[] | undefined {
  if (!assetId) return undefined;
  const trimmed = assetId.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "gold") return ["GC=F", "XAUUSD", "XAUUSD=X", "GOLD", "gold"];
  return [trimmed];
}

function topEntries(map: Record<string, number>, limit: number): Array<{ key: string; count: number }> {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}
