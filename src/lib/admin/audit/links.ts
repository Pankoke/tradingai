export const AUDIT_MODE_VALUES = ["all", "admin", "cron"] as const;
export const AUDIT_STATUS_VALUES = ["all", "ok", "failed"] as const;
export const AUDIT_KIND_VALUES = ["all", "exports", "ops"] as const;

export type AuditMode = (typeof AUDIT_MODE_VALUES)[number];
export type AuditStatus = (typeof AUDIT_STATUS_VALUES)[number];
export type AuditKind = (typeof AUDIT_KIND_VALUES)[number];

export type AuditLinkOptions = {
  mode?: AuditMode;
  status?: AuditStatus;
  kind?: AuditKind;
  q?: string;
};

function isAuditMode(value: string): value is AuditMode {
  return (AUDIT_MODE_VALUES as readonly string[]).includes(value);
}

function isAuditStatus(value: string): value is AuditStatus {
  return (AUDIT_STATUS_VALUES as readonly string[]).includes(value);
}

function isAuditKind(value: string): value is AuditKind {
  return (AUDIT_KIND_VALUES as readonly string[]).includes(value);
}

function normalize(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) return value[0]?.trim() || undefined;
  return undefined;
}

export function buildAuditHref(locale: string, options: AuditLinkOptions = {}): string {
  const params = new URLSearchParams();
  if (options.mode && options.mode !== "all") params.set("mode", options.mode);
  if (options.status && options.status !== "all") params.set("status", options.status);
  if (options.kind && options.kind !== "all") params.set("kind", options.kind);
  if (options.q?.trim()) params.set("q", options.q.trim());
  const query = params.toString();
  return query ? `/${locale}/admin/audit?${query}` : `/${locale}/admin/audit`;
}

export function parseAuditLinkQuery(raw: Record<string, string | string[] | undefined>): {
  mode: AuditMode;
  status: AuditStatus;
  kind: AuditKind;
  q?: string;
} {
  const modeRaw = normalize(raw.mode) ?? normalize(raw.authMode);
  const statusRaw = normalize(raw.status);
  const kindRaw = normalize(raw.kind);
  const q = normalize(raw.q) ?? normalize(raw.query);

  return {
    mode: modeRaw && isAuditMode(modeRaw) ? modeRaw : "all",
    status: statusRaw && isAuditStatus(statusRaw) ? statusRaw : "all",
    kind: kindRaw && isAuditKind(kindRaw) ? kindRaw : "all",
    q: q || undefined,
  };
}
