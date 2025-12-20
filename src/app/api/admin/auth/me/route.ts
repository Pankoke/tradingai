import type { NextRequest } from "next/server";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { isAdminEnabled } from "@/src/lib/admin/security";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

type AdminAuthStatus = {
  authenticated: boolean;
};

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAdminEnabled()) {
    return respondFail("NOT_FOUND", "Admin is disabled", 404);
  }
  if (!isAdminSessionFromRequest(request)) {
    return respondFail("UNAUTHORIZED", "Admin session missing", 401);
  }

  return respondOk<AdminAuthStatus>({ authenticated: true });
}
