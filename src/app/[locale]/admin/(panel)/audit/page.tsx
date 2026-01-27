import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { listAuditRuns } from "@/src/server/repositories/auditRunRepository";
import { JsonReveal } from "@/src/components/admin/JsonReveal";
import { getFreshnessRuns } from "@/src/server/admin/freshnessAuditService";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ParsedSearch = {
  action?: string;
  source?: string;
  ok?: "true" | "false";
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
  const ok = toArrayValue(raw.ok)?.trim() as "true" | "false" | undefined;
  const page = Math.max(1, Number(toArrayValue(raw.page) ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(toArrayValue(raw.pageSize) ?? "20") || 20));
  const freshness = toArrayValue(raw.freshness) === "1";
  const gate = toArrayValue(raw.gate)?.trim();
  return { action: action || undefined, source: source || undefined, ok, page, pageSize, freshness, gate };
}

function buildQueryString(
  current: ParsedSearch,
  overrides: Partial<Record<keyof ParsedSearch, string | number | undefined>>,
): string {
  const params = new URLSearchParams();
  if (current.action) params.set("action", current.action);
  if (current.source) params.set("source", current.source);
  if (current.ok) params.set("ok", current.ok);
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
    ok: resolvedSearch.ok === undefined ? undefined : resolvedSearch.ok === "true",
  };

  const runs: AuditRunRow[] = resolvedSearch.freshness
    ? (
        await getFreshnessRuns({
          hasFreshnessOnly: true,
          action: resolvedSearch.action,
          gate: resolvedSearch.gate,
          limit: resolvedSearch.pageSize,
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
        await listAuditRuns({
          filters: baseFilters,
          limit: resolvedSearch.pageSize,
          offset: (resolvedSearch.page - 1) * resolvedSearch.pageSize,
        })
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

  const total = runs.length;
  const pageCount = Math.max(1, Math.ceil(total / resolvedSearch.pageSize));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{messages["admin.audit.title"]}</p>
        <h1 className="text-3xl font-semibold text-white">{messages["admin.audit.title"]}</h1>
        <p className="text-sm text-slate-400">{messages["admin.audit.subtitle"]}</p>
      </header>

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
              name="ok"
              defaultValue={resolvedSearch.ok ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="">{messages["admin.audit.filters.any"]}</option>
              <option value="true">{messages["admin.audit.status.ok"]}</option>
              <option value="false">{messages["admin.audit.status.fail"]}</option>
            </select>
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
                <th className="px-4 py-3">{messages["admin.audit.table.source"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.table.status"]}</th>
                <th className="px-4 py-3">Freshness Gate</th>
                <th className="px-4 py-3">Skipped</th>
                <th className="px-4 py-3">{messages["admin.audit.table.duration"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.table.message"]}</th>
                <th className="px-4 py-3">{messages["admin.audit.table.details"]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-100">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-3 text-slate-300">
                    {"timestamp" in run
                      ? formatDate((run as { timestamp?: Date | string }).timestamp ?? run.createdAt, locale)
                      : run.createdAt instanceof Date
                        ? formatDate(run.createdAt, locale)
                        : formatDate(new Date(run.createdAt), locale)}
                  </td>
                  <td className="px-4 py-3">{getActionLabel(run.action, messages)}</td>
                  <td className="px-4 py-3">{getSourceLabel(run.source, messages)}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_TONES[run.ok ? "ok" : "fail"]}>
                      {run.ok ? messages["admin.audit.status.ok"] : messages["admin.audit.status.fail"]}
                    </span>
                  </td>
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
        {runs.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">{messages["admin.audit.empty"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
        <p>
          {messages["admin.audit.pagination.summary"]
            .replace("{page}", resolvedSearch.page.toString())
            .replace("{pages}", pageCount.toString())
            .replace("{total}", total.toString())}
        </p>
        <div className="flex gap-3">
          <Link
            className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40"
            aria-disabled={resolvedSearch.page <= 1}
            href={
              resolvedSearch.page <= 1
                ? "#"
                : buildQueryString(resolvedSearch, { page: resolvedSearch.page - 1 })
            }
          >
            {messages["admin.audit.pagination.prev"]}
          </Link>
          <Link
            className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40"
            aria-disabled={resolvedSearch.page >= pageCount}
            href={
              resolvedSearch.page >= pageCount
                ? "#"
                : buildQueryString(resolvedSearch, { page: resolvedSearch.page + 1 })
            }
          >
            {messages["admin.audit.pagination.next"]}
          </Link>
        </div>
      </div>
    </div>
  );
}

