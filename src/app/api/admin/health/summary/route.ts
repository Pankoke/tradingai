import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { buildHealthSummary } from "@/src/server/health/buildHealthSummary";

export async function GET(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ ok: false, errorCode: "admin_disabled", message: "Admin operations disabled" }, { status: 404 });
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json({ ok: false, errorCode: "unauthorized", message: "Missing or invalid admin session" }, { status: 401 });
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json({ ok: false, errorCode: "forbidden", message: "Invalid request origin" }, { status: 403 });
  }

  const results = await buildHealthSummary();
  return NextResponse.json({ ok: true, asOf: new Date().toISOString(), results });
}

export function POST() {
  return NextResponse.json({ ok: false, errorCode: "method_not_allowed", message: "Use GET" }, { status: 405 });
}
