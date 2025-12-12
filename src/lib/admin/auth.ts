import crypto from "crypto";
import type { NextRequest } from "next/server";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 Stunden

type SessionPayload = {
  sub: "admin";
  iat: number;
  exp: number;
};

function getEnv(key: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET"): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return value;
}

export function verifyAdminPassword(input: string): boolean {
  const expected = getEnv("ADMIN_PASSWORD");
  const a = Buffer.from(input ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function signPayload(payload: SessionPayload): string {
  const secret = getEnv("ADMIN_SESSION_SECRET");
  const payloadSerialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payloadSerialized).digest("base64url");
  return `${payloadSerialized}.${signature}`;
}

function parseSessionToken(token: string): SessionPayload | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }
  const secret = getEnv("ADMIN_SESSION_SECRET");
  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionPayload;
    if (data.sub !== "admin") return null;
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function createAdminSessionCookie() {
  const now = Date.now();
  const token = signPayload({
    sub: "admin",
    iat: now,
    exp: now + SESSION_DURATION_MS,
  });

  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    },
  };
}

export function clearAdminSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    },
  };
}

export function isAdminSessionFromCookies(cookiesStore: ReadonlyRequestCookies): boolean {
  const token = cookiesStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return Boolean(parseSessionToken(token));
}

export function isAdminSessionFromRequest(request: NextRequest): boolean {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return Boolean(parseSessionToken(token));
}

export function invalidateAdminSessionIfExpired(cookiesStore: ReadonlyRequestCookies) {
  const token = cookiesStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  const parsed = parseSessionToken(token);
  if (!parsed) {
    cookiesStore.delete(SESSION_COOKIE_NAME);
    return true;
  }
  return false;
}
