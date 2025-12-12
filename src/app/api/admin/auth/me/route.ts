import { NextResponse, type NextRequest } from "next/server";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";

export async function GET(request: NextRequest) {
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
