import { NextResponse, type NextRequest } from "next/server";
import { computeTechnicalBiasForAllActiveAssets } from "@/src/features/bias/computeTechnicalBias";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import type { Timeframe } from "@/src/server/providers/marketDataProvider";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";

type SuccessResponse = {
  ok: true;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  message: string;
  details: {
    processed: number;
    skipped: number;
    date: string;
    timeframe: string;
  };
};

type ErrorResponse = {
  ok: false;
  errorCode: string;
  message: string;
};

export async function POST(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { ok: false, errorCode: "admin_disabled", message: "Admin operations disabled" },
      { status: 404 },
    );
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json(
      { ok: false, errorCode: "unauthorized", message: "Missing or invalid admin session" },
      { status: 401 },
    );
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json({ ok: false, errorCode: "forbidden", message: "Invalid request origin" }, { status: 403 });
  }

  const now = new Date();
  const body = await request.json().catch(() => ({}));
  const timeframeValue = typeof body?.timeframe === "string" ? body.timeframe : "1D";
  const timeframe = timeframeValue as Timeframe;
  const date = typeof body?.date === "string" ? new Date(body.date) : now;

  const startedAt = new Date();
  try {
    const result = await computeTechnicalBiasForAllActiveAssets({
      date,
      timeframe,
    });
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    const response: SuccessResponse = {
      ok: true,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs,
      message: "Bias sync completed",
      details: {
        processed: result.processed,
        skipped: result.skipped,
        date: date.toISOString(),
        timeframe: timeframeValue,
      },
    };
    await createAuditRun({
      action: "bias_sync",
      source: "admin",
      ok: true,
      durationMs,
      message: response.message,
      meta: {
        processed: result.processed,
        skipped: result.skipped,
        timeframe: timeframeValue,
        date: date.toISOString(),
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    await createAuditRun({
      action: "bias_sync",
      source: "admin",
      ok: false,
      durationMs: Date.now() - startedAt.getTime(),
      message: "bias_sync_failed",
      error: error instanceof Error ? error.message : "unknown error",
      meta: { timeframe: timeframeValue, date: date.toISOString() },
    });
    const body: ErrorResponse = {
      ok: false,
      errorCode: "bias_failed",
      message: error instanceof Error ? error.message : "Bias sync failed",
    };
    return NextResponse.json(body, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false, errorCode: "method_not_allowed", message: "Use POST" }, { status: 405 });
}
