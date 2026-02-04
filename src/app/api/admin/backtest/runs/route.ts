import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { listRecentBacktestRunsMeta } from "@/src/server/repositories/backtestRunRepository";

type ListResponse =
  | { ok: true; runs: Awaited<ReturnType<typeof listRecentBacktestRunsMeta>> }
  | { ok: false; error: string; code: string };

function parseLimit(searchParams: URLSearchParams): number {
  const raw = searchParams.get("limit");
  if (!raw) return 50;
  const num = Number(raw);
  if (!Number.isFinite(num)) return 50;
  return Math.min(200, Math.max(1, Math.floor(num)));
}

export async function GET(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json<ListResponse>({ ok: false, error: "Admin disabled", code: "admin_disabled" }, { status: 404 });
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json<ListResponse>({ ok: false, error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json<ListResponse>({ ok: false, error: "Forbidden", code: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams);
  const runs = await listRecentBacktestRunsMeta(limit);
  return NextResponse.json<ListResponse>({ ok: true, runs });
}
