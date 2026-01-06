import type { NextRequest } from "next/server";
import type { PerceptionSnapshot, Setup } from "@/src/lib/engine/types";
import { requestSnapshotBuild } from "@/src/server/perception/snapshotBuildService";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { logger } from "@/src/lib/logger";
import { SnapshotBuildInProgressError } from "@/src/server/perception/snapshotBuildService";

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
    const result = await requestSnapshotBuild({ source: "cron", force: true });
    const snapshotRecord = result.snapshot.snapshot;
    const snapshotTime =
      snapshotRecord.snapshotTime instanceof Date
        ? snapshotRecord.snapshotTime
        : new Date(snapshotRecord.snapshotTime);
    const setups = (snapshotRecord.setups ?? []) as Setup[];
    const snapshot: PerceptionSnapshot = {
      ...snapshotRecord,
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
      meta: { reused: result.reused, totalSetups: setups.length },
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
