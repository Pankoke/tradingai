import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { buildAndStorePerceptionSnapshot } from "@/src/features/perception/build/buildSetups";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { logger } from "@/src/lib/logger";

const cronLogger = logger.child({ route: "cron-perception-intraday" });
const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const startedAt = Date.now();
  try {
    const snapshot = await buildAndStorePerceptionSnapshot({
      source: "cron_intraday",
      allowSync: false,
      profiles: ["INTRADAY"],
      label: "intraday",
    });

    const durationMs = Date.now() - startedAt;
    await createAuditRun({
      action: "perception_intraday",
      source: "cron",
      ok: true,
      durationMs,
      message: "cron_perception_intraday_success",
      meta: {
        setups: snapshot.snapshot.setups.length,
        snapshotId: snapshot.snapshot.id,
      },
    });

    return respondOk({
      snapshotId: snapshot.snapshot.id,
      setups: snapshot.snapshot.setups.length,
      durationMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const durationMs = Date.now() - startedAt;
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
