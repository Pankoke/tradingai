import type { NextRequest } from "next/server";
import { logger } from "@/src/lib/logger";
import { resolveAdminAuthConfig } from "@/src/server/auth/authConfig";

const WINDOW_MS = 10 * 60 * 1000; // 10 Minuten
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type RateLimitEntry = {
  attempts: number[];
  blockedUntil?: number;
};

const loginAttempts = new Map<string, RateLimitEntry>();
let loggedDisabledReason = false;

export function isAdminEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  const config = resolveAdminAuthConfig();
  if (!config.enabled && config.reason && !loggedDisabledReason) {
    logger.warn("Admin interface disabled", { reason: config.reason });
    loggedDisabledReason = true;
  }
  return config.enabled;
}

function getEntry(identifier: string): RateLimitEntry {
  let entry = loginAttempts.get(identifier);
  if (!entry) {
    entry = { attempts: [] };
    loginAttempts.set(identifier, entry);
  }
  return entry;
}

export function getClientIdentifier(request: NextRequest): string {
  const forwardedHeader = request.headers.get("x-forwarded-for");
  const forwarded = forwardedHeader ? forwardedHeader.split(",")[0]?.trim() : undefined;
  const realIp = request.headers.get("x-real-ip");
  return forwarded ?? realIp ?? "unknown";
}

export function canAttemptAdminLogin(identifier: string): { allowed: boolean; retryAfterMs?: number } {
  const entry = getEntry(identifier);
  const now = Date.now();
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.blockedUntil - now };
  }
  entry.attempts = entry.attempts.filter((ts) => now - ts < WINDOW_MS);
  if (entry.attempts.length >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
    entry.attempts = [];
    return { allowed: false, retryAfterMs: entry.blockedUntil - now };
  }
  return { allowed: true };
}

export function registerAdminLoginFailure(identifier: string): void {
  const entry = getEntry(identifier);
  const now = Date.now();
  entry.attempts.push(now);
  entry.attempts = entry.attempts.filter((ts) => now - ts < WINDOW_MS);
  if (entry.attempts.length >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
    entry.attempts = [];
  }
}

export function clearAdminLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

export function validateAdminRequestOrigin(request: NextRequest): boolean {
  const candidate = request.headers.get("origin") ?? request.headers.get("referer");
  if (!candidate) {
    return false;
  }
  try {
    const candidateOrigin = new URL(candidate).origin;
    const allowedOrigin = request.nextUrl.origin;
    return candidateOrigin === allowedOrigin;
  } catch {
    return false;
  }
}
