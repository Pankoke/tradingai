import type { AdminOrCronAuthResult } from "@/src/lib/admin/auth/requireAdminOrCron";

type AuditResultMeta = {
  ok: boolean;
  rows?: number;
  bytes?: number;
};

type AuditMetaParams = {
  auth: AdminOrCronAuthResult;
  request: { method?: string; url?: string };
  params?: Record<string, unknown>;
  result?: AuditResultMeta;
  error?: unknown;
};

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (depth >= 2) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(source)) {
      const lower = key.toLowerCase();
      if (lower.includes("secret") || lower.includes("token") || lower.includes("password")) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = sanitizeValue(nested, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function buildAuditMeta(params: AuditMetaParams): Record<string, unknown> {
  const requestPath = params.request.url ? new URL(params.request.url).pathname : undefined;
  return {
    authMode: params.auth.mode,
    actor: {
      source: params.auth.actor.source,
      userId: params.auth.actor.userId ?? null,
      email: params.auth.actor.email ?? null,
    },
    request: {
      path: requestPath ?? null,
      method: params.request.method ?? null,
    },
    params: sanitizeValue(params.params ?? {}) as Record<string, unknown>,
    result: sanitizeValue(params.result ?? { ok: true }) as Record<string, unknown>,
    ...(params.error ? { error: String(params.error) } : {}),
  };
}
