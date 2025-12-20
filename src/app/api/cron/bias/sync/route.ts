import { NextRequest } from "next/server";
import { computeTechnicalBiasForAllActiveAssets } from "@/src/features/bias/computeTechnicalBias";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import type { Timeframe } from "@/src/server/providers/marketDataProvider";
import { logger } from "@/src/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";

const cronLogger = logger.child({ route: "cron-bias-sync" });

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const { date, timeframe, error } = await parseBody(request);
  if (error) {
    return respondFail("VALIDATION_ERROR", error, 400);
  }

  const startedAt = Date.now();
  const targetDate = date ?? new Date();
  const targetTimeframe = timeframe ?? ("1D" as Timeframe);

  try {
    const result = await computeTechnicalBiasForAllActiveAssets({
      date: targetDate,
      timeframe: targetTimeframe,
    });
    const durationMs = Date.now() - startedAt;
    const payload = {
      processed: result.processed,
      skipped: result.skipped,
      date: targetDate.toISOString(),
      timeframe: targetTimeframe,
    };
    await createAuditRun({
      action: "bias_sync",
      source: "cron",
      ok: true,
      durationMs,
      message: "bias_sync_completed",
      meta: payload,
    });
    cronLogger.info("bias sync completed", { durationMs, ...payload });
    return respondOk(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bias sync failed";
    const durationMs = Date.now() - startedAt;
    cronLogger.error("bias sync failed", { durationMs, error: message });
    await createAuditRun({
      action: "bias_sync",
      source: "cron",
      ok: false,
      durationMs,
      message: "bias_sync_failed",
      error: message,
    });
    return respondFail("INTERNAL_ERROR", message, 500);
  }
}

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get(AUTH_HEADER);
  if (authHeader?.startsWith("Bearer ")) {
    if (authHeader.slice("Bearer ".length).trim() === CRON_SECRET) {
      return true;
    }
  }
  const alt = request.headers.get(ALT_HEADER);
  if (alt && alt === CRON_SECRET) {
    return true;
  }
  return false;
}

async function parseBody(
  request: NextRequest,
): Promise<{ date?: Date; timeframe?: Timeframe; error?: string }> {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader === null || lengthHeader === "0") {
    return {};
  }
  try {
    const body = (await request.json()) as { date?: string; timeframe?: string };
    const parsed: { date?: Date; timeframe?: Timeframe; error?: string } = {};
    if (body.date) {
      const d = new Date(body.date);
      if (Number.isNaN(d.getTime())) {
        return { error: "Invalid date" };
      }
      parsed.date = d;
    }
    if (body.timeframe) {
      parsed.timeframe = body.timeframe as Timeframe;
    }
    return parsed;
  } catch {
    return { error: "Invalid JSON body" };
  }
}
