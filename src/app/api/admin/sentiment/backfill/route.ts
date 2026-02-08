import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { backfillSentimentSnapshots } from "@/src/server/sentiment/backfillSentimentSnapshots";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";

type BackfillResponse =
  | {
      ok: true;
      assetId: string;
      processed: number;
      upserted: number | null;
      inserted: number | null;
      updated: number | null;
      warnings: string[];
      chunks: Array<{
        asOfIso: string;
        fromIso: string;
        toIso: string;
        ok: boolean;
        error?: string;
        writeResultNote?: string;
      }>;
    }
  | { ok: false; error: string; code: string };

const DEFAULT_STEP_HOURS = 4;
const DEFAULT_LOOKBACK_HOURS = 24;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  if (!isAdminEnabled()) {
    return NextResponse.json<BackfillResponse>(
      { ok: false, error: "Admin disabled", code: "admin_disabled" },
      { status: 404 },
    );
  }
  let auth;
  try {
    auth = await requireAdminOrCron(request, { allowCron: true, allowAdminToken: true });
  } catch (error) {
    const unauthorized = asUnauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    return NextResponse.json<BackfillResponse>(
      { ok: false, error: "Unauthorized", code: "unauthorized" },
      { status: 401 },
    );
  }
  if (auth.mode === "admin" && !validateAdminRequestOrigin(request)) {
    return NextResponse.json<BackfillResponse>(
      { ok: false, error: "Forbidden", code: "forbidden" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const assetId = typeof body?.assetId === "string" ? body.assetId.trim() : "";
  const fromIso = typeof body?.fromIso === "string" ? body.fromIso : "";
  const toIso = typeof body?.toIso === "string" ? body.toIso : "";
  const stepHours =
    typeof body?.stepHours === "number" && body.stepHours > 0 ? Math.floor(body.stepHours) : DEFAULT_STEP_HOURS;
  const lookbackHours =
    typeof body?.lookbackHours === "number" && body.lookbackHours > 0
      ? Math.floor(body.lookbackHours)
      : DEFAULT_LOOKBACK_HOURS;

  if (!assetId || !fromIso || !toIso) {
    return NextResponse.json<BackfillResponse>(
      { ok: false, error: "assetId/fromIso/toIso required", code: "missing_params" },
      { status: 400 },
    );
  }

  const result = await backfillSentimentSnapshots({
    assetId,
    fromIso,
    toIso,
    stepHours,
    lookbackHours,
  });

  if (!result.ok) {
    await createAuditRun({
      action: "admin_sentiment_backfill",
      source: auth.mode,
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "admin_sentiment_backfill_failed",
      error: result.error,
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: { assetId, fromIso, toIso, stepHours, lookbackHours },
        result: { ok: false },
        error: result.error,
      }),
    });
    return NextResponse.json<BackfillResponse>(result, { status: 400 });
  }

  const response: BackfillResponse = {
    ok: true,
    assetId: result.assetId,
    processed: result.processed,
    upserted: result.upserted,
    inserted: result.inserted,
    updated: result.updated,
    warnings: result.warnings,
    chunks: result.chunks.map((c) => ({
      asOfIso: c.asOfIso,
      fromIso: c.fromIso,
      toIso: c.toIso,
      ok: c.ok,
      error: c.error,
      writeResultNote: c.writeResult.note,
    })),
  };

  await createAuditRun({
    action: "admin_sentiment_backfill",
    source: auth.mode,
    ok: true,
    durationMs: Date.now() - startedAt,
    message: "admin_sentiment_backfill_success",
    meta: buildAuditMeta({
      auth,
      request: { method: request.method, url: request.url },
      params: { assetId, fromIso, toIso, stepHours, lookbackHours },
      result: { ok: true, rows: result.processed },
    }),
  });

  return NextResponse.json<BackfillResponse>(response);
}

export function GET() {
  return NextResponse.json<BackfillResponse>(
    { ok: false, error: "Use POST", code: "method_not_allowed" },
    { status: 405 },
  );
}
