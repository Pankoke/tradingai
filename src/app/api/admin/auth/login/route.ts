import { NextResponse, type NextRequest } from "next/server";
import { createAdminSessionCookie, verifyAdminPassword } from "@/src/lib/admin/auth";
import {
  canAttemptAdminLogin,
  clearAdminLoginAttempts,
  getClientIdentifier,
  isAdminEnabled,
  registerAdminLoginFailure,
} from "@/src/lib/admin/security";

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

export async function POST(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const identifier = getClientIdentifier(request);
  const allowance = canAttemptAdminLogin(identifier);
  if (!allowance.allowed) {
    const retrySeconds = allowance.retryAfterMs
      ? Math.max(1, Math.ceil(allowance.retryAfterMs / 1000))
      : undefined;
    return NextResponse.json(
      { error: "Zu viele Login-Versuche. Bitte warte kurz." },
      {
        status: 429,
        headers: retrySeconds ? { "Retry-After": retrySeconds.toString() } : undefined,
      },
    );
  }

  const body = (await request.json().catch(() => ({}))) as LoginPayload;
  const password = body.password ?? "";

  try {
    if (!verifyAdminPassword(password)) {
      await delayFailure();
      registerAdminLoginFailure(identifier);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "Admin authentication unavailable"
        : (error as Error).message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  clearAdminLoginAttempts(identifier);
  const cookie = createAdminSessionCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
