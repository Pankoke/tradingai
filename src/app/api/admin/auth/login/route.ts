import { NextResponse, type NextRequest } from "next/server";
import { createAdminSessionCookie, verifyAdminPassword } from "@/src/lib/admin/auth";

type LoginPayload = {
  password?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as LoginPayload;
  const password = body.password ?? "";
  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const cookie = createAdminSessionCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
