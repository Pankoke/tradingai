import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { enrichEventsAi } from "@/src/server/events/enrich/enrichEventsAi";
import { logger } from "@/src/lib/logger";
import { i18nConfig } from "@/src/lib/i18n/config";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";
const MAX_LIMIT = 30;
const MAX_DAYS = 30;

const cronLogger = logger.child({ route: "cron-events-enrich" });

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const { params, error } = await parseBody(request);
  if (error) {
    return respondFail("VALIDATION_ERROR", error, 400);
  }

  const startedAt = Date.now();
  try {
    const result = await enrichEventsAi(params);
    cronLogger.info("events AI enrichment completed", {
      durationMs: Date.now() - startedAt,
      ...serializeResult(result),
      windowFrom: result.windowFrom?.toISOString() ?? null,
      windowTo: result.windowTo?.toISOString() ?? null,
    });
    await createAuditRun({
      action: "events.enrich",
      source: "cron",
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "cron_events_enrich_success",
      meta: {
        ...serializeResult(result),
        limit: params?.limit ?? null,
        windowFrom: result.windowFrom?.toISOString() ?? null,
        windowTo: result.windowTo?.toISOString() ?? null,
      },
    });
    revalidateEvents();
    return respondOk(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    cronLogger.error("events AI enrichment failed", {
      durationMs: Date.now() - startedAt,
      error: message,
    });
    await createAuditRun({
      action: "events.enrich",
      source: "cron",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "cron_events_enrich_failed",
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
): Promise<{ params?: Parameters<typeof enrichEventsAi>[0]; error?: string }> {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader === null || lengthHeader === "0") {
    return { params: undefined };
  }
  try {
    const body = await request.json();
    if (body.limit !== undefined) {
      const parsed = Number(body.limit);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_LIMIT) {
        return { error: `limit must be between 1 and ${MAX_LIMIT}` };
      }
    }
    if (body.daysAhead !== undefined) {
      const parsed = Number(body.daysAhead);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_DAYS) {
        return { error: `daysAhead must be between 1 and ${MAX_DAYS}` };
      }
    }
    const params: Parameters<typeof enrichEventsAi>[0] = {};
    if (body.limit !== undefined) {
      params.limit = Number(body.limit);
    }
    if (body.daysAhead !== undefined) {
      params.daysAhead = Number(body.daysAhead);
    }
    return { params: Object.keys(params).length ? params : undefined };
  } catch {
    return { error: "Invalid JSON body" };
  }
}

function revalidateEvents(): void {
  for (const locale of i18nConfig.locales) {
    revalidatePath(`/${locale}/events`);
  }
}

function serializeResult(result: Awaited<ReturnType<typeof enrichEventsAi>>) {
  return {
    enriched: result.enriched,
    skipped: result.skipped,
    failed: result.failed,
    totalCandidates: result.totalCandidates,
    limitUsed: result.limitUsed,
    totalRetries: result.totalRetries,
    skippedLowValueMacro: result.skippedLowValueMacro,
    skippedAlreadyEnriched: result.skippedAlreadyEnriched,
  };
}
