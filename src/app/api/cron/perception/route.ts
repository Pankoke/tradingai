import type { NextRequest } from "next/server";
import type { PerceptionSnapshot, Setup } from "@/src/lib/engine/types";
import { requestSnapshotBuild } from "@/src/server/perception/snapshotBuildService";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { logger } from "@/src/lib/logger";
import { SnapshotBuildInProgressError } from "@/src/server/perception/snapshotBuildService";
import { consumeLlmUsageStats } from "@/src/server/ai/ringSummaryOpenAi";
import { gateCandlesPerAsset } from "@/src/server/health/freshnessGate";
import { FRESHNESS_THRESHOLDS_MINUTES } from "@/src/server/health/freshnessThresholds";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";

const cronLogger = logger.child({ route: "cron-perception" });
const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";

type CronSuccessBody = {
  generatedAt: string;
  totalSetups: number;
};

export async function GET(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const startedAt = Date.now();
  try {
    const assets = await getActiveAssets();
    const assetIds = assets.map((a) => a.id);
    const freshnessGate = await gateCandlesPerAsset({
      assetIds,
      timeframes: ["1D", "1W"],
      thresholdsByTimeframe: {
        "1D": FRESHNESS_THRESHOLDS_MINUTES.swing["1D"] ?? 4320,
        "1W": FRESHNESS_THRESHOLDS_MINUTES.swing["1W"] ?? 20160,
      },
    });
    const allowedAssetIds = freshnessGate.perAsset
      .filter((entry) => entry.results.every((r) => r.status === "ok"))
      .map((entry) => entry.assetId);

    if (allowedAssetIds.length === 0) {
      await createAuditRun({
        action: "snapshot_build",
        source: "cron",
        ok: true,
        durationMs: Date.now() - startedAt,
        message: "cron_snapshot_skipped_due_to_freshness",
        meta: {
          freshness: {
            gate: "perception_swing",
            status: "stale",
            skippedAssets: freshnessGate.perAsset.map((entry) => ({
              assetId: entry.assetId,
              reasons: entry.results.filter((r) => r.status !== "ok"),
            })),
            checkedTimeframes: ["1D", "1W"],
            thresholdsMinutes: {
              "1D": FRESHNESS_THRESHOLDS_MINUTES.swing["1D"],
              "1W": FRESHNESS_THRESHOLDS_MINUTES.swing["1W"],
            },
          },
          externalFetches: 0,
        },
      });
      return respondOk<CronSuccessBody>({
        generatedAt: new Date().toISOString(),
        totalSetups: 0,
      });
    }

    const result = await requestSnapshotBuild({
      source: "cron",
      force: true,
      profiles: ["SWING"],
      allowSync: false,
      assetFilter: allowedAssetIds,
    });
    const snapshotRecord = result.snapshot.snapshot;
    const snapshotTime =
      snapshotRecord.snapshotTime instanceof Date
        ? snapshotRecord.snapshotTime
        : new Date(snapshotRecord.snapshotTime);
    const setups = (snapshotRecord.setups ?? []) as Setup[];
    const snapshot: PerceptionSnapshot = {
      ...snapshotRecord,
      version: snapshotRecord.version ?? "unknown",
      setups,
      generatedAt: snapshotTime.toISOString(),
      universe: setups.map((setup) => setup.symbol).filter(Boolean),
      setupOfTheDayId: setups[0]?.id ?? snapshotRecord.id,
    };

    await createAuditRun({
      action: "snapshot_build",
      source: "cron",
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "cron_snapshot_build",
      meta: {
        reused: result.reused,
        totalSetups: setups.length,
        llm: consumeLlmUsageStats(),
        profiles: ["SWING"],
        timeframesUsed: ["1D", "1W"],
        externalFetches: 0,
        freshness: {
          gate: "perception_swing",
          status: allowedAssetIds.length === assetIds.length ? "ok" : "partial",
          skippedAssets: freshnessGate.perAsset
            .filter((entry) => entry.results.some((r) => r.status !== "ok"))
            .map((entry) => ({
              assetId: entry.assetId,
              reasons: entry.results.filter((r) => r.status !== "ok"),
            })),
          checkedTimeframes: ["1D", "1W"],
          thresholdsMinutes: {
            "1D": FRESHNESS_THRESHOLDS_MINUTES.swing["1D"],
            "1W": FRESHNESS_THRESHOLDS_MINUTES.swing["1W"],
          },
        },
      },
    });

    return respondOk<CronSuccessBody>({
      generatedAt: snapshot.generatedAt,
      totalSetups: setups.length,
    });
  } catch (error) {
    if (error instanceof SnapshotBuildInProgressError) {
      cronLogger.warn("Snapshot build skipped due to existing lock", { source: error.source });
      return respondOk<CronSuccessBody>({
        generatedAt: new Date().toISOString(),
        totalSetups: 0,
      });
    }
    const message = error instanceof Error ? error.message : "unknown error";
    cronLogger.error("Failed to build perception snapshot", { error: message });
    await createAuditRun({
      action: "snapshot_build",
      source: "cron",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "cron_snapshot_failed",
      error: message,
    });
    return respondFail("INTERNAL_ERROR", "Failed to build perception snapshot", 500, {
      error: message,
    });
  }
}

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get(AUTH_HEADER);
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token === CRON_SECRET) return true;
  }
  const alt = request.headers.get(ALT_HEADER);
  if (alt && alt === CRON_SECRET) {
    return true;
  }
  return false;
}
