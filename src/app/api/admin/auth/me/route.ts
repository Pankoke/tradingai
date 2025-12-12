import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { isAdminEnabled } from "@/src/lib/admin/security";

export async function GET(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
