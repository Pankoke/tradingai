type UnknownRecord = Record<string, unknown>;

export type AuditAuthMode = "admin" | "cron";
export type AuditKind = "exports" | "ops";
export type AuditStatusFilter = "all" | "ok" | "failed";
export type AuditKindFilter = "all" | AuditKind;
export type AuditAuthModeFilter = "all" | AuditAuthMode;

export type AuditRowInput = {
  id: string;
  action: string;
  source: string;
  ok: boolean;
  createdAt: Date | string;
  durationMs?: number | null;
  message?: string | null;
  error?: string | null;
  meta?: unknown;
  gate?: string | null;
  skippedCount?: number;
};

export type AuditRowViewModel = {
  id: string;
  action: string;
  source: string;
  createdAt: Date | string;
  durationMs: number | null;
  message: string | null;
  error: string | null;
  gate: string | null;
  skippedCount: number;
  meta: unknown;
  authMode: AuditAuthMode | null;
  actorSource: string | null;
  actorLabel: string | null;
  requestMethod: string | null;
  requestPath: string | null;
  requestLabel: string | null;
  resultOk: boolean;
  rows: number | null;
  bytes: number | null;
  kind: AuditKind;
};

export type AuditRowFilters = {
  authMode: AuditAuthModeFilter;
  status: AuditStatusFilter;
  kind: AuditKindFilter;
  search?: string;
};

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function resolveAuthMode(meta: UnknownRecord | null): AuditAuthMode | null {
  const raw = meta?.authMode;
  if (raw === "admin" || raw === "cron") return raw;
  return null;
}

function resolveActor(meta: UnknownRecord | null): { source: string | null; label: string | null } {
  const actor = asRecord(meta?.actor);
  if (!actor) return { source: null, label: null };
  const source = typeof actor.source === "string" ? actor.source : null;
  const email = typeof actor.email === "string" ? actor.email : null;
  const userId = typeof actor.userId === "string" ? actor.userId : null;
  const label = email ?? userId ?? (source === "cron" ? "cron" : null);
  return { source, label };
}

function resolveRequest(meta: UnknownRecord | null): {
  method: string | null;
  path: string | null;
  label: string | null;
} {
  const request = asRecord(meta?.request);
  if (!request) return { method: null, path: null, label: null };
  const method = typeof request.method === "string" ? request.method : null;
  const path = typeof request.path === "string" ? request.path : null;
  const label = method || path ? `${method ?? "?"} ${path ?? "?"}` : null;
  return { method, path, label };
}

function resolveResult(meta: UnknownRecord | null, fallbackOk: boolean): {
  ok: boolean;
  rows: number | null;
  bytes: number | null;
} {
  const result = asRecord(meta?.result);
  const metaOk = typeof result?.ok === "boolean" ? result.ok : null;
  return {
    ok: metaOk ?? fallbackOk,
    rows: asFiniteNumber(result?.rows),
    bytes: asFiniteNumber(result?.bytes),
  };
}

export function classifyAuditKind(action: string): AuditKind {
  return action.includes("_export") ? "exports" : "ops";
}

export function mapAuditRunToRow(run: AuditRowInput): AuditRowViewModel {
  const meta = asRecord(run.meta);
  const authMode = resolveAuthMode(meta);
  const actor = resolveActor(meta);
  const request = resolveRequest(meta);
  const result = resolveResult(meta, run.ok);

  return {
    id: run.id,
    action: run.action,
    source: run.source,
    createdAt: run.createdAt,
    durationMs: run.durationMs ?? null,
    message: run.message ?? null,
    error: run.error ?? null,
    gate: run.gate ?? null,
    skippedCount: run.skippedCount ?? 0,
    meta: run.meta,
    authMode,
    actorSource: actor.source,
    actorLabel: actor.label,
    requestMethod: request.method,
    requestPath: request.path,
    requestLabel: request.label,
    resultOk: result.ok,
    rows: result.rows,
    bytes: result.bytes,
    kind: classifyAuditKind(run.action),
  };
}

export function filterAuditRows(rows: AuditRowViewModel[], filters: AuditRowFilters): AuditRowViewModel[] {
  const normalizedSearch = (filters.search ?? "").trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.authMode !== "all" && row.authMode !== filters.authMode) return false;
    if (filters.status === "ok" && !row.resultOk) return false;
    if (filters.status === "failed" && row.resultOk) return false;
    if (filters.kind !== "all" && row.kind !== filters.kind) return false;
    if (normalizedSearch) {
      const haystack = `${row.action} ${row.requestPath ?? ""}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });
}
