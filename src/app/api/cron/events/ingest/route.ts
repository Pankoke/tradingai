import { NextRequest, NextResponse } from "next/server";
import { ingestJbNewsCalendar } from "@/src/server/events/ingest/ingestJbNewsCalendar";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { logger } from "@/src/lib/logger";

const cronLogger = logger.child({ route: "cron-events-ingest" });
const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";
const MAX_LOOKAHEAD = 60;

type SuccessBody = {
  ok: true;
  result: Awaited<ReturnType<typeof ingestJbNewsCalendar>>;
};

type ErrorBody = {
  ok: false;
  error: string;
};

export async function POST(request: NextRequest): Promise<NextResponse<SuccessBody | ErrorBody>> {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Cron secret not configured" }, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parseResult = parseParams(request);
  if (parseResult.error) {
    return NextResponse.json({ ok: false, error: parseResult.error }, { status: 400 });
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
    return NextResponse.json({ ok: true, result });
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
    return NextResponse.json({ ok: false, error: message }, { status });
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
