import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import {
  countOldAuditRuns,
  countOldBiasSnapshots,
  countOldCandles,
  countOldEvents,
  countOldPerceptionSnapshotItems,
} from "@/src/server/repositories/cleanupRepository";
import { logger } from "@/src/lib/logger";

const cronLogger = logger.child({ route: "cron-cleanup" });
const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";

const RETENTION_DAYS = {
  candles: 180,
  perceptionSnapshotItems: 30,
  biasSnapshots: 90,
  eventsHigh: 365,
  eventsLow: 90,
  auditRuns: 180,
} as const;

type CleanupCounts = Record<keyof typeof RETENTION_DAYS, number>;

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }

  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const startedAt = Date.now();
  const asOfIso = new Date().toISOString();

  try {
    const counts = await gatherCounts();
    const meta = {
      asOfIso,
      retentionDays: RETENTION_DAYS,
      countsByTable: counts,
      notes: ["dry-run only"],
    };

    await createAuditRun({
      action: "cleanup.dry_run",
      source: "cron",
      ok: true,
      durationMs: Date.now() - startedAt,
      meta,
    });

    return respondOk({
      asOfIso,
      retentionDays: RETENTION_DAYS,
      countsByTable: counts,
      notes: ["dry-run only"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    cronLogger.error("cleanup dry-run failed", { error: message });
    console.error("cleanup dry-run failed", message, error);
    await createAuditRun({
      action: "cleanup.dry_run",
      source: "cron",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "cleanup dry-run failed",
      error: message,
    });

    return respondFail("INTERNAL_ERROR", message, 500);
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

function daysAgo(days: number): Date {
  const result = new Date();
  result.setUTCDate(result.getUTCDate() - days);
  return result;
}

async function gatherCounts(): Promise<CleanupCounts> {
  const now = new Date();
  const candlesCutoff = daysAgo(RETENTION_DAYS.candles);
  const perceptionCutoff = daysAgo(RETENTION_DAYS.perceptionSnapshotItems);
  const biasCutoff = daysAgo(RETENTION_DAYS.biasSnapshots);
  const eventsHighCutoff = daysAgo(RETENTION_DAYS.eventsHigh);
  const eventsLowCutoff = daysAgo(RETENTION_DAYS.eventsLow);
  const auditCutoff = daysAgo(RETENTION_DAYS.auditRuns);

  const [
    candles,
    perceptionItems,
    bias,
    eventsCounts,
    auditRuns,
  ] = await Promise.all([
    countOldCandles(candlesCutoff),
    countOldPerceptionSnapshotItems(perceptionCutoff),
    countOldBiasSnapshots(biasCutoff),
    countOldEvents(eventsHighCutoff, eventsLowCutoff),
    countOldAuditRuns(auditCutoff),
  ]);

  return {
    candles,
    perceptionSnapshotItems: perceptionItems,
    biasSnapshots: bias,
    eventsHigh: eventsCounts.high,
    eventsLow: eventsCounts.low,
    auditRuns,
  };
}
