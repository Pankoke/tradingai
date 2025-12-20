import type { NextRequest } from "next/server";
import { z } from "zod";
import { AdminAuthConfigError, createAdminSessionCookie, verifyAdminPassword } from "@/src/lib/admin/auth";
import {
  canAttemptAdminLogin,
  clearAdminLoginAttempts,
  getClientIdentifier,
  isAdminEnabled,
  registerAdminLoginFailure,
} from "@/src/lib/admin/security";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";

type LoginPayload = {
  password?: string;
};

const FAILURE_DELAY_MIN_MS = 400;
const FAILURE_DELAY_MAX_MS = 900;

async function delayFailure(): Promise<void> {
  const jitter =
    FAILURE_DELAY_MIN_MS + Math.random() * (FAILURE_DELAY_MAX_MS - FAILURE_DELAY_MIN_MS);
  await new Promise((resolve) => setTimeout(resolve, jitter));
}

const bodySchema = z.object({
  password: z.string().min(1, "password is required"),
});

export async function POST(request: NextRequest): Promise<Response> {
  if (!isAdminEnabled()) {
    return respondFail("NOT_FOUND", "Admin is disabled", 404);
  }

  const identifier = getClientIdentifier(request);
  const allowance = canAttemptAdminLogin(identifier);
  if (!allowance.allowed) {
    const retrySeconds = allowance.retryAfterMs
      ? Math.max(1, Math.ceil(allowance.retryAfterMs / 1000))
      : undefined;
    return respondFail("RATE_LIMITED", "Too many login attempts", 429, {
      retryAfterSeconds: retrySeconds,
    });
  }

  const body = (await request.json().catch(() => ({}))) as LoginPayload;
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return respondFail("VALIDATION_ERROR", "Invalid credentials payload", 400, parsed.error.issues);
  }
  const password = parsed.data.password;

  try {
    if (!verifyAdminPassword(password)) {
      await delayFailure();
      registerAdminLoginFailure(identifier);
      return respondFail("UNAUTHORIZED", "Invalid credentials", 401);
    }
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "Admin authentication unavailable"
        : (error as Error).message;
    return respondFail("INTERNAL_ERROR", message, 500);
  }

  clearAdminLoginAttempts(identifier);
  try {
    const cookie = createAdminSessionCookie();
    const response = respondOk({ authenticated: true });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    if (error instanceof AdminAuthConfigError) {
      return respondFail("INTERNAL_ERROR", "Admin authentication unavailable", 503);
    }
    throw error;
  }
}
