import type { NextRequest } from "next/server";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { respondFail } from "@/src/server/http/apiResponse";

export type AdminOrCronMode = "admin" | "cron";

export type AdminOrCronActor = {
  source: AdminOrCronMode;
  userId?: string;
  email?: string;
};

export type AdminOrCronAuthDetails = {
  hasAdmin: boolean;
  hasCron: boolean;
  usedAdmin: boolean;
  usedCron: boolean;
};

export type AdminOrCronAuthResult = {
  mode: AdminOrCronMode;
  actor: AdminOrCronActor;
  details: AdminOrCronAuthDetails;
};

type RequireAdminOrCronOptions = {
  allowCron?: boolean;
  allowAdminToken?: boolean;
};

type RequestLike = Request | NextRequest;

export class AdminOrCronAuthError extends Error {
  readonly code = "UNAUTHORIZED";
  readonly status = 401;
  readonly details: AdminOrCronAuthDetails;

  constructor(message: string, details: AdminOrCronAuthDetails) {
    super(message);
    this.name = "AdminOrCronAuthError";
    this.details = details;
  }
}

function parseBearer(request: RequestLike): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

function hasNextRequestCookies(request: RequestLike): request is NextRequest {
  return "cookies" in request && typeof request.cookies?.get === "function";
}

export async function requireAdminOrCron(
  request: RequestLike,
  options: RequireAdminOrCronOptions = {},
): Promise<AdminOrCronAuthResult> {
  const allowCron = options.allowCron ?? true;
  const allowAdminToken = options.allowAdminToken ?? true;
  const bearer = parseBearer(request);
  const cronHeader = request.headers.get("x-cron-secret")?.trim() || null;
  const adminToken = process.env.ADMIN_API_TOKEN?.trim() || null;
  const cronSecret = process.env.CRON_SECRET?.trim() || null;
  const hasAdminSession = hasNextRequestCookies(request) ? isAdminSessionFromRequest(request) : false;
  const hasAdminBearer = Boolean(allowAdminToken && adminToken && bearer && bearer === adminToken);
  const hasAdmin = hasAdminSession || hasAdminBearer;
  const hasCronCredential = Boolean((bearer || cronHeader) && cronSecret);
  const usedCron =
    allowCron &&
    Boolean(
      cronSecret &&
        ((bearer && bearer === cronSecret) || (cronHeader && cronHeader === cronSecret)),
    );
  const usedAdmin = hasAdmin;

  const details: AdminOrCronAuthDetails = {
    hasAdmin,
    hasCron: hasCronCredential,
    usedAdmin,
    usedCron,
  };

  if (usedAdmin) {
    return {
      mode: "admin",
      actor: {
        source: "admin",
        userId: request.headers.get("x-admin-user-id") ?? undefined,
        email: request.headers.get("x-admin-email") ?? undefined,
      },
      details,
    };
  }

  if (usedCron) {
    return {
      mode: "cron",
      actor: {
        source: "cron",
      },
      details,
    };
  }

  throw new AdminOrCronAuthError("Unauthorized", details);
}

export function asUnauthorizedResponse(error: unknown): Response | null {
  if (!(error instanceof AdminOrCronAuthError)) {
    return null;
  }
  return respondFail(error.code, error.message, error.status, error.details);
}
