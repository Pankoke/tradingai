import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { listAuditRuns } from "@/src/server/repositories/auditRunRepository";
import { JsonReveal } from "@/src/components/admin/JsonReveal";
import { getFreshnessRuns } from "@/src/server/admin/freshnessAuditService";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import { buildOpsGovernanceRelatedLinks } from "@/src/components/admin/relatedLinks";
import {
  filterAuditRows,
  mapAuditRunToRow,
  type AuditAuthModeFilter,
  type AuditKindFilter,
  type AuditRowViewModel,
  type AuditStatusFilter,
} from "@/src/lib/admin/audit/viewModel";
import { parseAuditLinkQuery } from "@/src/lib/admin/audit/links";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ParsedSearch = {
  action?: string;
  source?: string;
  status: AuditStatusFilter;
  authMode: AuditAuthModeFilter;
  kind: AuditKindFilter;
  query?: string;
  page: number;
  pageSize: number;
  freshness?: boolean;
  gate?: string;
};

type AuditRunBase = Awaited<ReturnType<typeof listAuditRuns>>["runs"][number];
type AuditRunRow = AuditRunBase & {
  gate?: string | null;
  status?: string | null;
  skippedCount?: number;
};

type FreshnessMeta = {
  gate?: string;
  status?: string;
  skippedAssets?: unknown[];
};

const MODE_OPTIONS = ["admin", "cron"] as const;
const KIND_OPTIONS = ["exports", "ops"] as const;

export const ACTION_OPTIONS = [
  "snapshot_build",
  "snapshot_build_swing_backfill",
  "perception_intraday",
  "marketdata_sync",
  "marketdata.intraday_sync",
  "bias_sync",
  "events.ingest",
  "events.enrich",
  "outcomes.evaluate",
] as const;
const SOURCE_OPTIONS = ["admin", "cron", "ui"] as const;
const GATE_OPTIONS = ["perception_swing", "perception_intraday", "outcomes"] as const;

const STATUS_TONES = {
  ok: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40",
  fail: "bg-rose-500/15 text-rose-200 border border-rose-400/40",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function getFreshnessMeta(meta: unknown): FreshnessMeta | null {
  const record = asRecord(meta);
  if (!record) return null;
  const freshness = asRecord(record.freshness);
  if (!freshness) return null;
  return {
    gate: typeof freshness.gate === "string" ? freshness.gate : undefined,
    status: typeof freshness.status === "string" ? freshness.status : undefined,
    skippedAssets: Array.isArray(freshness.skippedAssets) ? freshness.skippedAssets : undefined,
  };
}

function toArrayValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parseSearchParams(raw: Record<string, string | string[] | undefined>): ParsedSearch {
  const action = toArrayValue(raw.action)?.trim();
  const source = toArrayValue(raw.source)?.trim();
  const fromLinks = parseAuditLinkQuery(raw);
  const status: AuditStatusFilter = fromLinks.status;
  const authMode: AuditAuthModeFilter = fromLinks.mode;
  const kind: AuditKindFilter = fromLinks.kind;
  const query = fromLinks.q;
  const page = Math.max(1, Number(toArrayValue(raw.page) ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(toArrayValue(raw.pageSize) ?? "20") || 20));
  const freshness = toArrayValue(raw.freshness) === "1";
  const gate = toArrayValue(raw.gate)?.trim();
  return {
    action: action || undefined,
    source: source || undefined,
    status,
    authMode,
    kind,
    query: query || undefined,
    page,
    pageSize,
    freshness,
    gate,
  };
}

function buildQueryString(
  current: ParsedSearch,
  overrides: Partial<Record<keyof ParsedSearch, string | number | undefined>>,
): string {
  const params = new URLSearchParams();
  if (current.action) params.set("action", current.action);
  if (current.source) params.set("source", current.source);
  if (current.status !== "all") params.set("status", current.status);
  if (current.authMode !== "all") params.set("mode", current.authMode);
  if (current.kind !== "all") params.set("kind", current.kind);
  if (current.query) params.set("q", current.query);
  if (current.freshness) params.set("freshness", "1");
  if (current.gate) params.set("gate", current.gate);
  params.set("page", current.page.toString());
  params.set("pageSize", current.pageSize.toString());

  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

function formatDate(value: Date | string, locale: Locale): string {
  const formatterLocale = locale === "de" ? "de-DE" : "en-US";
  return new Date(value).toLocaleString(formatterLocale);
}

function getActionLabel(action: string, messages: typeof enMessages): string {
  const key = `admin.audit.actions.${action}` as keyof typeof enMessages;
  return messages[key] ?? action;
}

function getSourceLabel(source: string, messages: typeof enMessages): string {
  const key = `admin.audit.sources.${source}` as keyof typeof enMessages;
  return messages[key] ?? source;
}

export default async function AdminAuditPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  if (!["de", "en"].includes(locale)) {
    notFound();
  }
  const messages = locale === "de" ? deMessages : enMessages;
  const resolvedSearch = parseSearchParams(await searchParams);

  const baseFilters = {
    action: resolvedSearch.action,
    source: resolvedSearch.source,
  };

  const loadedRuns: AuditRunRow[] = resolvedSearch.freshness
    ? (
        await getFreshnessRuns({
          hasFreshnessOnly: true,
          action: resolvedSearch.action,
          gate: resolvedSearch.gate,
          limit: 200,
        })
      ).map((run) => ({
        id: run.id,
        action: run.action,
        createdAt: run.timestamp,
        source: run.source,
        error: run.error ?? null,
        message: run.message ?? null,
        ok: run.ok,
        durationMs: run.durationMs ?? null,
        meta: run.meta ?? {},
        gate: run.gate ?? null,
        status: run.freshnessStatus ?? null,
        skippedCount: run.skippedCount ?? 0,
      }))
    : (
        await listAuditRuns({ filters: baseFilters, limit: 200, offset: 0 })
      ).runs.map((run) => {
        const freshness = getFreshnessMeta(run.meta);
        const skippedAssets = Array.isArray(freshness?.skippedAssets) ? freshness?.skippedAssets : [];
        return {
          ...run,
          gate: typeof freshness?.gate === "string" ? freshness.gate : null,
          status: typeof freshness?.status === "string" ? freshness.status : null,
          skippedCount: skippedAssets.length,
        };
      });

  const rows: AuditRowViewModel[] = loadedRuns.map((run) => mapAuditRunToRow(run));
  const filteredRows = filterAuditRows(rows, {
    authMode: resolvedSearch.authMode,
    status: resolvedSearch.status,
    kind: resolvedSearch.kind,
    search: resolvedSearch.query,
  });
  const total = filteredRows.length;
  const pageCount = Math.max(1, Math.ceil(total / resolvedSearch.pageSize));
  const currentPage = Math.min(resolvedSearch.page, pageCount);
  const pageStart = (currentPage - 1) * resolvedSearch.pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + resolvedSearch.pageSize);
  const related = buildOpsGovernanceRelatedLinks(locale, {
    operations: messages["admin.nav.ops"],
    auditTrail: messages["admin.nav.audit"],
    systemHealth: messages["admin.nav.system"],
  });

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        title={messages["admin.audit.title"]}
        description={messages["admin.audit.subtitle"]}
        relatedLabel={messages["admin.section.related"]}
        links={related}
        currentKey="auditTrail"
        notice={messages["admin.audit.notice"]}
        variant="info"
      />

      <form className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4" method="get">
        <input type="hidden" name="page" value="1" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.audit.filters.action"]}</span>
            <select
              name="action"
              defaultValue={resolvedSearch.action ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="">{messages["admin.audit.filters.any"]}</option>
              {ACTION_OPTIONS.map((action) => (
                <option key={action} value={action}>
                  {getActionLabel(action, messages)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.audit.filters.source"]}</span>
            <select
              name="source"
              defaultValue={resolvedSearch.source ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="">{messages["admin.audit.filters.any"]}</option>
              {SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {getSourceLabel(source, messages)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.audit.filters.status"]}</span>
            <select
              name="status"
              defaultValue={resolvedSearch.status}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="all">{messages["admin.audit.filters.any"]}</option>
              <option value="ok">{messages["admin.audit.status.ok"]}</option>
              <option value="failed">{messages["admin.audit.status.fail"]}</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-200">
              <span>{messages["admin.audit.filters.mode"]}</span>
            <select
              name="mode"
              defaultValue={resolvedSearch.authMode}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="all">{messages["admin.audit.filters.any"]}</option>
              {MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {messages[`admin.audit.filters.mode.${mode}` as keyof typeof messages]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.audit.filters.kind"]}</span>
            <select
              name="kind"
              defaultValue={resolvedSearch.kind}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="all">{messages["admin.audit.filters.any"]}</option>
              {KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {messages[`admin.audit.filters.kind.${kind}` as keyof typeof messages]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-200">
              <span>{messages["admin.audit.filters.search"]}</span>
            <input
              name="q"
              defaultValue={resolvedSearch.query ?? ""}
              placeholder={messages["admin.audit.search.placeholder"]}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.audit.filters.pageSize"]}</span>
            <select
              name="pageSize"
              defaultValue={resolvedSearch.pageSize}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              name="freshness"
              value="1"
              defaultChecked={resolvedSearch.freshness}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500"
            />
            <span>Only Freshness</span>
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            <span>Gate</span>
            <select
              name="gate"
              defaultValue={resolvedSearch.gate ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="">{messages["admin.audit.filters.any"]}</option>
              {GATE_OPTIONS.map((gate) => (
                <option key={gate} value={gate}>
                  {gate}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
          >
            {messages["admin.audit.filters.apply"]}
          </button>
          <Link
            href={`/${locale}/admin/audit`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            {messages["admin.audit.filters.reset"]}
          </Link>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">{messages["admin.audit.table.time"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.table.action"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.columns.mode"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.columns.actor"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.columns.request"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.table.status"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.columns.rows"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.columns.bytes"]}</th>
                <th className="px-4 py-3">Freshness Gate</th>
                <th className="px-4 py-3">Skipped</th>
                <th className="px-4 py-3">{messages["admin.audit.table.duration"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.table.message"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.table.details"]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-100">
              {pageRows.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-3 text-slate-300">
                    {run.createdAt instanceof Date
                      ? formatDate(run.createdAt, locale)
                      : formatDate(new Date(run.createdAt), locale)}
                  </td>
                  <td className="px-4 py-3">{getActionLabel(run.action, messages)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200">
                      {run.authMode ? messages[`admin.audit.filters.mode.${run.authMode}` as keyof typeof messages] : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{run.actorLabel ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{run.requestLabel ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_TONES[run.resultOk ? "ok" : "fail"]}>
                      {run.resultOk ? messages["admin.audit.status.ok"] : messages["admin.audit.status.fail"]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{run.rows ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{run.bytes ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-200">{run.gate ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-200">{run.skippedCount ?? 0}</td>
                  <td className="px-4 py-3 text-slate-300">{run.durationMs != null ? `${run.durationMs} ms` : "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{run.message ?? "—"}</td>
                  <td className="px-4 py-3">
                    {run.meta || run.error ? (
                      <JsonReveal
                        data={{ meta: run.meta ?? undefined, error: run.error ?? undefined }}
                        showLabel={messages["admin.audit.details.show"]}
                        hideLabel={messages["admin.audit.details.hide"]}
                      />
                    ) : (
                      <span className="text-slate-500">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRows.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">{messages["admin.audit.empty"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
        <p>
          {messages["admin.audit.pagination.summary"]
            .replace("{page}", currentPage.toString())
            .replace("{pages}", pageCount.toString())
            .replace("{total}", total.toString())}
        </p>
        <div className="flex gap-3">
          <Link
            className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40"
            aria-disabled={currentPage <= 1}
            href={
              currentPage <= 1
                ? "#"
                : buildQueryString(resolvedSearch, { page: currentPage - 1 })
            }
          >
            {messages["admin.audit.pagination.prev"]}
          </Link>
          <Link
            className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40"
            aria-disabled={currentPage >= pageCount}
            href={
              currentPage >= pageCount
                ? "#"
                : buildQueryString(resolvedSearch, { page: currentPage + 1 })
            }
          >
            {messages["admin.audit.pagination.next"]}
          </Link>
        </div>
      </div>
    </div>
  );
}

