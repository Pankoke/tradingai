import type { NextRequest } from "next/server";
import { clearAdminSessionCookie } from "@/src/lib/admin/auth";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isAdminEnabled()) {
    return respondFail("NOT_FOUND", "Admin is disabled", 404);
  }

  if (!validateAdminRequestOrigin(request)) {
    return respondFail("FORBIDDEN", "Forbidden", 403);
  }

  const cookie = clearAdminSessionCookie();
  const response = respondOk({ authenticated: false });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
