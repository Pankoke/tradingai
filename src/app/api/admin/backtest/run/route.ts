import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { runBacktest } from "@/src/server/backtest/runBacktest";

type BacktestResponse =
  | { ok: true; reportPath: string; steps: number }
  | { ok: false; error: string; code: string };

export async function POST(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json<BacktestResponse>({ ok: false, error: "Admin disabled", code: "admin_disabled" }, { status: 404 });
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json<BacktestResponse>({ ok: false, error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json<BacktestResponse>({ ok: false, error: "Forbidden", code: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const assetId = typeof body?.assetId === "string" ? body.assetId.trim() : "";
  const fromIso = typeof body?.fromIso === "string" ? body.fromIso : "";
  const toIso = typeof body?.toIso === "string" ? body.toIso : "";
  const stepHours = typeof body?.stepHours === "number" && body.stepHours > 0 ? Math.floor(body.stepHours) : 4;
  if (!assetId || !fromIso || !toIso) {
    return NextResponse.json<BacktestResponse>(
      { ok: false, error: "assetId/fromIso/toIso required", code: "missing_params" },
      { status: 400 },
    );
  }

  const result = await runBacktest({ assetId, fromIso, toIso, stepHours });
  const status = result.ok ? 200 : 400;
  return NextResponse.json<BacktestResponse>(result, { status });
}

export function GET() {
  return NextResponse.json<BacktestResponse>({ ok: false, error: "Use POST", code: "method_not_allowed" }, { status: 405 });
}
