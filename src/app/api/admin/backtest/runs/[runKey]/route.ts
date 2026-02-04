import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { getBacktestRunByKey } from "@/src/server/repositories/backtestRunRepository";

type DetailResponse =
  | { ok: true; run: NonNullable<Awaited<ReturnType<typeof getBacktestRunByKey>>> }
  | { ok: false; error: string; code: string };

type Params = { runKey: string };

function isPromiseParams(value: Params | Promise<Params>): value is Promise<Params> {
  return typeof (value as Promise<Params>).then === "function";
}

export async function GET(request: NextRequest, context: { params: Params | Promise<Params> }) {
  if (!isAdminEnabled()) {
    return NextResponse.json<DetailResponse>({ ok: false, error: "Admin disabled", code: "admin_disabled" }, { status: 404 });
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json<DetailResponse>({ ok: false, error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json<DetailResponse>({ ok: false, error: "Forbidden", code: "forbidden" }, { status: 403 });
  }

  const params = isPromiseParams(context.params) ? await context.params : context.params;
  const runKey = params.runKey;
  const run = await getBacktestRunByKey(runKey);
  if (!run) {
    return NextResponse.json<DetailResponse>({ ok: false, error: "Not found", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json<DetailResponse>({ ok: true, run });
}
