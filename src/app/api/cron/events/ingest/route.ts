import { NextRequest } from "next/server";
import { ingestJbNewsCalendar } from "@/src/server/events/ingest/ingestJbNewsCalendar";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { logger } from "@/src/lib/logger";
import { revalidatePath } from "next/cache";
import { i18nConfig } from "@/src/lib/i18n/config";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

const cronLogger = logger.child({ route: "cron-events-ingest" });
const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";
const MAX_LOOKAHEAD = 60;

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }

  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const parseResult = parseParams(request);
  if (parseResult.error) {
    return respondFail("VALIDATION_ERROR", parseResult.error, 400);
  }

  const startedAt = Date.now();
  try {
    const result = await ingestJbNewsCalendar(parseResult.params);
    cronLogger.info("jb-news event ingestion completed", {
      durationMs: Date.now() - startedAt,
      ...result,
    });
    await createAuditRun({
      action: "events.ingest",
      source: "cron",
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "cron_events_ingest_success",
      meta: result,
    });
    revalidateEventsPages();
    return respondOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    cronLogger.error("jb-news event ingestion failed", {
      durationMs: Date.now() - startedAt,
      error: message,
    });
    await createAuditRun({
      action: "events.ingest",
      source: "cron",
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "cron_events_ingest_failed",
      error: message,
    });
    const status = message.toLowerCase().includes("jb-news") ? 502 : 500;
    return respondFail("INTERNAL_ERROR", message, status);
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

function parseParams(
  request: NextRequest,
): { params?: Parameters<typeof ingestJbNewsCalendar>[0]; error?: string } {
  const params = new URL(request.url).searchParams;
  const lookaheadParameter = params.get("lookaheadDays");
  const fromParam = params.get("from");
  const toParam = params.get("to");

  const options: Parameters<typeof ingestJbNewsCalendar>[0] = {};

  if (lookaheadParameter) {
    const parsed = Number.parseInt(lookaheadParameter, 10);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_LOOKAHEAD) {
      return { error: `lookaheadDays must be between 1 and ${MAX_LOOKAHEAD}` };
    }
    options.lookaheadDays = parsed;
  }

  if (fromParam) {
    const fromDate = new Date(fromParam);
    if (Number.isNaN(fromDate.getTime())) {
      return { error: "Invalid from parameter" };
    }
    options.from = fromDate;
  }

  if (toParam) {
    const toDate = new Date(toParam);
    if (Number.isNaN(toDate.getTime())) {
      return { error: "Invalid to parameter" };
    }
    options.to = toDate;
  }

  if (options.from && options.to && options.to < options.from) {
    return { error: "`to` must be after `from`" };
  }

  return { params: Object.keys(options).length ? options : undefined };
}

function revalidateEventsPages(): void {
  for (const locale of i18nConfig.locales) {
    revalidatePath(`/${locale}/events`);
  }
}
