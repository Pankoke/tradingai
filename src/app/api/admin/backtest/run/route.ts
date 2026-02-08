import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { runBacktest } from "@/src/server/backtest/runBacktest";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";

type BacktestResponse =
  | { ok: true; reportPath: string; steps: number }
  | { ok: false; error: string; code: string };

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  if (!isAdminEnabled()) {
    return NextResponse.json<BacktestResponse>({ ok: false, error: "Admin disabled", code: "admin_disabled" }, { status: 404 });
  }
  let auth;
  try {
    auth = await requireAdminOrCron(request, { allowCron: true, allowAdminToken: true });
  } catch (error) {
    const unauthorized = asUnauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    return NextResponse.json<BacktestResponse>({ ok: false, error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }
  if (auth.mode === "admin" && !validateAdminRequestOrigin(request)) {
    return NextResponse.json<BacktestResponse>({ ok: false, error: "Forbidden", code: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const assetId = typeof body?.assetId === "string" ? body.assetId.trim() : "";
  const fromIso = typeof body?.fromIso === "string" ? body.fromIso : "";
  const toIso = typeof body?.toIso === "string" ? body.toIso : "";
  const stepHours = typeof body?.stepHours === "number" && body.stepHours > 0 ? Math.floor(body.stepHours) : 4;
  const feeBpsRaw = typeof body?.feeBps === "number" ? body.feeBps : 0;
  const slippageBpsRaw = typeof body?.slippageBps === "number" ? body.slippageBps : 0;
  const holdStepsRaw = typeof body?.holdSteps === "number" ? body.holdSteps : 3;
  const snapshotModeRaw = typeof body?.snapshotMode === "string" ? body.snapshotMode : "live";
  const feeBps = Math.min(1000, Math.max(0, Math.floor(feeBpsRaw)));
  const slippageBps = Math.min(1000, Math.max(0, Math.floor(slippageBpsRaw)));
  const holdSteps = Math.min(200, Math.max(1, Math.floor(holdStepsRaw)));
  const snapshotMode = snapshotModeRaw === "playback" || snapshotModeRaw === "live" ? snapshotModeRaw : null;
  if (!assetId || !fromIso || !toIso) {
    return NextResponse.json<BacktestResponse>(
      { ok: false, error: "assetId/fromIso/toIso required", code: "missing_params" },
      { status: 400 },
    );
  }
  if (!snapshotMode) {
    return NextResponse.json<BacktestResponse>(
      { ok: false, error: "snapshotMode must be 'live' or 'playback'", code: "invalid_snapshot_mode" },
      { status: 400 },
    );
  }

  const result = await runBacktest({
    assetId,
    fromIso,
    toIso,
    stepHours,
    costsConfig: { feeBps, slippageBps },
    exitPolicy: { kind: "hold-n-steps", holdSteps, price: "step-open" },
    snapshotMode,
  });
  const status = result.ok ? 200 : 400;
  await createAuditRun({
    action: "admin_backtest_run",
    source: auth.mode,
    ok: result.ok,
    durationMs: Date.now() - startedAt,
    message: result.ok ? "admin_backtest_run_success" : "admin_backtest_run_failed",
    meta: buildAuditMeta({
      auth,
      request: { method: request.method, url: request.url },
      params: { assetId, fromIso, toIso, stepHours, feeBps, slippageBps, holdSteps, snapshotMode },
      result: { ok: result.ok },
      error: result.ok ? undefined : result.error,
    }),
    error: result.ok ? undefined : result.error,
  });
  return NextResponse.json<BacktestResponse>(result, { status });
}

export function GET() {
  return NextResponse.json<BacktestResponse>({ ok: false, error: "Use POST", code: "method_not_allowed" }, { status: 405 });
}
