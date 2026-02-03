import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import { perceptionSnapshotStoreAdapter } from "@/src/server/adapters/perceptionSnapshotStoreAdapter";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { logger } from "@/src/lib/logger";
import { db } from "@/src/server/db/db";
import { sql } from "drizzle-orm";
import { gateCandlesPerAsset } from "@/src/server/health/freshnessGate";
import { FRESHNESS_THRESHOLDS_MINUTES } from "@/src/server/health/freshnessThresholds";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { buildPerceptionSnapshotWithContainer } from "@/src/server/perception/perceptionEngineFactory";
import { maybeEnhanceRingAiSummaryWithLLM } from "@/src/server/ai/ringSummaryOpenAi";

const cronLogger = logger.child({ route: "cron-perception-intraday" });
const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";
const SNAPSHOT_LOCK_KEY = BigInt(917337);

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const startedAt = Date.now();
  const lockResult = await db.execute<{ locked: boolean }>(
    sql`select pg_try_advisory_lock(${SNAPSHOT_LOCK_KEY}) as locked`,
  );
  const locked = Boolean(lockResult[0]?.locked);
  if (!locked) {
    cronLogger.warn("Skipping intraday perception build due to existing lock");
    return respondOk({ skipped: true, message: "skipped (already running)" });
  }

  try {
    const assets = await getActiveAssets();
    const assetIds = assets.map((a) => a.id);
    const freshnessGate = await gateCandlesPerAsset({
      assetIds,
      timeframes: ["1H", "4H"],
      thresholdsByTimeframe: {
        "1H": FRESHNESS_THRESHOLDS_MINUTES.intraday["1H"] ?? 180,
        "4H": FRESHNESS_THRESHOLDS_MINUTES.intraday["4H"] ?? 480,
      },
    });
    const allowedAssetIds = freshnessGate.perAsset
      .filter((entry) => entry.results.find((r) => r.timeframe === "1H")?.status === "ok")
      .map((entry) => entry.assetId);

    if (allowedAssetIds.length === 0) {
      const durationMsSkip = Date.now() - startedAt;
      await createAuditRun({
        action: "perception_intraday",
        source: "cron",
        ok: true,
        durationMs: durationMsSkip,
        message: "cron_perception_intraday_skipped_due_to_freshness",
        meta: {
          freshness: {
            gate: "perception_intraday",
            status: "stale",
            skippedAssets: freshnessGate.perAsset.map((entry) => ({
              assetId: entry.assetId,
              reasons: entry.results.filter((r) => r.timeframe === "1H" && r.status !== "ok"),
            })),
            checkedTimeframes: ["1H", "4H"],
            thresholdsMinutes: {
              "1H": FRESHNESS_THRESHOLDS_MINUTES.intraday["1H"],
              "4H": FRESHNESS_THRESHOLDS_MINUTES.intraday["4H"],
            },
          },
          externalFetches: 0,
          skipped: true,
        },
      });
      return respondOk({
        skipped: true,
        reason: "freshness_gate",
        setups: 0,
        durationMs: durationMsSkip,
      });
    }

    const snapshotTime = new Date();
    const snapshotStore = createSnapshotStore(perceptionSnapshotStoreAdapter);
    const snapshot = await buildAndStorePerceptionSnapshot({
      source: "cron_intraday",
      allowSync: false,
      profiles: ["INTRADAY"],
      label: "intraday",
      assetFilter: allowedAssetIds,
      snapshotTime,
      snapshotStore,
      deps: {
        buildPerceptionSnapshot: buildPerceptionSnapshotWithContainer,
        getActiveAssets,
        maybeEnhanceRingAiSummaryWithLLM,
      },
    });
    const setupsArr =
      Array.isArray((snapshot as { setups?: unknown }).setups)
        ? (snapshot as { setups: unknown[] }).setups
        : Array.isArray((snapshot as { snapshot?: { setups?: unknown } })?.snapshot?.setups)
          ? ((snapshot as { snapshot: { setups: unknown[] } }).snapshot.setups)
          : [];

    const durationMs = Date.now() - startedAt;
    await createAuditRun({
      action: "perception_intraday",
      source: "cron",
      ok: true,
      durationMs,
      message: "cron_perception_intraday_success",
      meta: {
        setups: setupsArr.length,
        snapshotId: snapshot.snapshot.id,
        profiles: ["INTRADAY"],
        timeframesUsed: ["1H", "4H"],
        externalFetches: 0,
        freshness: {
          gate: "perception_intraday",
          status: allowedAssetIds.length === assetIds.length ? "ok" : "partial",
          skippedAssets: freshnessGate.perAsset
            .filter((entry) => entry.results.some((r) => r.timeframe === "1H" && r.status !== "ok"))
            .map((entry) => ({
              assetId: entry.assetId,
              reasons: entry.results.filter((r) => r.timeframe === "1H" && r.status !== "ok"),
            })),
          checkedTimeframes: ["1H", "4H"],
          thresholdsMinutes: {
            "1H": FRESHNESS_THRESHOLDS_MINUTES.intraday["1H"],
            "4H": FRESHNESS_THRESHOLDS_MINUTES.intraday["4H"],
          },
        },
      },
    });

    if (setupsArr.length === 0) {
      const durationMsSkip = Date.now() - startedAt;
      cronLogger.warn("Intraday build produced no setups (skipped)", { durationMs: durationMsSkip });
      return respondOk({
        skipped: true,
        reason: "no_setups_available",
        setups: 0,
        durationMs: durationMsSkip,
      });
    }

    return respondOk({
      snapshotId: snapshot.snapshot.id,
      setups: setupsArr.length,
      durationMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const durationMs = Date.now() - startedAt;
    if (message.includes("No setups available to pick setup of the day")) {
      const durationMsSkip = Date.now() - startedAt;
      cronLogger.warn("Intraday build skipped: no setups available", { durationMs: durationMsSkip });
      await createAuditRun({
        action: "perception_intraday",
        source: "cron",
        ok: true,
        durationMs: durationMsSkip,
        message: "cron_perception_intraday_skipped_no_setups",
        meta: { skipped: true, reason: "no_setups_available" },
      });
      return respondOk({
        skipped: true,
        reason: "no_setups_available",
        setups: 0,
        durationMs: durationMsSkip,
      });
    }

    cronLogger.error("failed to build intraday perception snapshot", { error: message });
    await createAuditRun({
      action: "perception_intraday",
      source: "cron",
      ok: false,
      durationMs,
      message: "cron_perception_intraday_failed",
      error: message,
    });
    return respondFail("INTERNAL_ERROR", message, 500);
  } finally {
    try {
      await db.execute(sql`select pg_advisory_unlock(${SNAPSHOT_LOCK_KEY})`);
    } catch (unlockError) {
      cronLogger.warn("Failed to release advisory lock", { error: unlockError instanceof Error ? unlockError.message : unlockError });
    }
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
