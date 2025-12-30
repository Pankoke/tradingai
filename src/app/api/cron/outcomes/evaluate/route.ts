import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { runOutcomeEvaluationBatch } from "@/src/server/services/outcomeEvaluationRunner";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { logger } from "@/src/lib/logger";

const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";
const routeLogger = logger.child({ route: "cron-outcomes-evaluate" });

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const params = request.nextUrl.searchParams;
  const body = await readBody(request);

  const daysBack = parseInt(String(body.daysBack ?? params.get("daysBack") ?? "30"), 10);
  const limit = parseInt(String(body.limit ?? params.get("limit") ?? "200"), 10);
  const dryRun = parseBool(body.dryRun ?? params.get("dryRun") ?? params.get("dry_run") ?? "false");
  const debug = parseBool(body.debug ?? params.get("debug") ?? "false");

  const startedAt = Date.now();
  try {
    const result = await runOutcomeEvaluationBatch({ daysBack, limit, dryRun });
    const durationMs = Date.now() - startedAt;
    await createAuditRun({
      action: "outcomes.evaluate",
      source: "cron",
      ok: true,
      durationMs,
      message: "outcomes_evaluated",
      meta: { ...result.metrics, processed: result.processed, dryRun },
    });
    const topReasons = Object.entries(result.reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));
    return respondOk({
      metrics: result.metrics,
      processed: result.processed,
      durationMs,
      dryRun,
      ...(debug
        ? {
            stats: result.stats,
            topNotEligibleReasons: topReasons,
            sampleSetupIds: result.sampleSetupIds,
          }
        : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const durationMs = Date.now() - startedAt;
    routeLogger.error("failed to evaluate outcomes", { error: message });
    await createAuditRun({
      action: "outcomes.evaluate",
      source: "cron",
      ok: false,
      durationMs,
      message: "outcomes_evaluated_failed",
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

async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) return {};
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}
