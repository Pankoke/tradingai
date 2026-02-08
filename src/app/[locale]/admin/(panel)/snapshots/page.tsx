import Link from "next/link";
import { notFound } from "next/navigation";
import { listSnapshotsPaged } from "@/src/server/repositories/perceptionSnapshotRepository";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import { buildDataMonitoringRelatedLinks } from "@/src/components/admin/relatedLinks";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ParsedSearch = {
  label?: string;
  dataMode?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

function getParamValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parseSearchParams(raw: Record<string, string | string[] | undefined>): ParsedSearch {
  const label = getParamValue(raw.label)?.trim();
  const dataMode = getParamValue(raw.dataMode)?.trim();
  const from = getParamValue(raw.from)?.slice(0, 10);
  const to = getParamValue(raw.to)?.slice(0, 10);
  const page = Math.max(1, Number(getParamValue(raw.page) ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(getParamValue(raw.pageSize) ?? "20") || 20));
  return { label: label || undefined, dataMode: dataMode || undefined, from, to, page, pageSize };
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDate(value: Date | string, locale: Locale): string {
  const formatterLocale = locale === "de" ? "de-DE" : "en-US";
  return new Date(value).toLocaleString(formatterLocale);
}

function formatDateInput(value?: string): string {
  if (!value) return "";
  return value;
}

function getSetupsCount(snapshot: { setups: unknown }): number {
  if (Array.isArray(snapshot.setups)) return snapshot.setups.length;
  return 0;
}

function buildQueryString(
  current: ParsedSearch,
  overrides: Partial<Record<keyof ParsedSearch, string | number | undefined>>,
): string {
  const params = new URLSearchParams();
  if (current.label) params.set("label", current.label);
  if (current.dataMode) params.set("dataMode", current.dataMode);
  if (current.from) params.set("from", current.from);
  if (current.to) params.set("to", current.to);
  params.set("page", current.page.toString());
  params.set("pageSize", current.pageSize.toString());

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function AdminSnapshotsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  if (!["de", "en"].includes(locale)) {
    notFound();
  }
  const messages = locale === "de" ? deMessages : enMessages;
  const resolvedSearch = parseSearchParams(await searchParams);

  const { snapshots, total } = await listSnapshotsPaged({
    filters: {
      label: resolvedSearch.label,
      dataMode: resolvedSearch.dataMode,
      from: parseDate(resolvedSearch.from),
      to: parseDate(resolvedSearch.to),
    },
    page: resolvedSearch.page,
    pageSize: resolvedSearch.pageSize,
  });

  const pageCount = Math.max(1, Math.ceil(total / resolvedSearch.pageSize));
  const showingFrom = total === 0 ? 0 : (resolvedSearch.page - 1) * resolvedSearch.pageSize + 1;
  const showingTo = Math.min(total, resolvedSearch.page * resolvedSearch.pageSize);

  const quickFromDate = new Date();
  quickFromDate.setUTCDate(quickFromDate.getUTCDate() - 7);
  const quickFrom = quickFromDate.toISOString().slice(0, 10);
  const related = buildDataMonitoringRelatedLinks(locale, {
    snapshots: messages["admin.nav.snapshots"],
    marketDataHealth: messages["admin.nav.marketdataHealth"],
    coverage: messages["admin.nav.coverage"],
    healthReports: messages["admin.nav.healthReports"],
  });

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        title={messages["admin.snapshots.title"]}
        description={messages["admin.snapshots.subtitle"]}
        relatedLabel={messages["admin.section.related"]}
        links={related}
        currentKey="snapshots"
        notice={messages["admin.snapshots.notice"]}
        variant="info"
      />

      <form className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4" method="get">
        <input type="hidden" name="page" value="1" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.snapshots.filters.label"]}</span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              name="label"
              defaultValue={resolvedSearch.label ?? ""}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.snapshots.filters.dataMode"]}</span>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              name="dataMode"
              defaultValue={resolvedSearch.dataMode ?? ""}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.snapshots.filters.from"]}</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              name="from"
              defaultValue={formatDateInput(resolvedSearch.from)}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.snapshots.filters.to"]}</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              name="to"
              defaultValue={formatDateInput(resolvedSearch.to)}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-200">
            <span>{messages["admin.snapshots.filters.pageSize"]}</span>
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
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-lg bg-sky-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
          >
            {messages["admin.snapshots.filters.apply"]}
          </button>
          <Link
            href={buildQueryString(resolvedSearch, {
              label: "",
              dataMode: "",
              from: "",
              to: "",
              page: 1,
            })}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            {messages["admin.snapshots.filters.reset"]}
          </Link>
          <Link
            href={buildQueryString(resolvedSearch, { from: quickFrom, page: 1 })}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            {messages["admin.snapshots.filters.last7"]}
          </Link>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">{messages["admin.snapshots.table.time"]}</th>
                <th className="px-4 py-3">{messages["admin.snapshots.table.label"]}</th>
                <th className="px-4 py-3">{messages["admin.snapshots.table.mode"]}</th>
                <th className="px-4 py-3">{messages["admin.snapshots.table.setups"]}</th>
                <th className="px-4 py-3">{messages["admin.snapshots.table.generated"]}</th>
                <th className="px-4 py-3">{messages["admin.snapshots.table.actions"]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-100">
              {snapshots.map((snapshot) => {
                const setupsCount = getSetupsCount(snapshot);
                return (
                  <tr key={snapshot.id}>
                    <td className="px-4 py-3 text-slate-300">
                      {formatDate(snapshot.snapshotTime, locale)}
                    </td>
                    <td className="px-4 py-3">{snapshot.label ?? "–"}</td>
                    <td className="px-4 py-3 text-slate-400">{snapshot.dataMode}</td>
                    <td className="px-4 py-3">{setupsCount}</td>
                    <td className="px-4 py-3">{snapshot.generatedMs ?? "–"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/${locale}/admin/snapshots/${snapshot.id}`}
                        className="text-xs text-sky-300 hover:text-sky-100"
                      >
                        {messages["admin.snapshots.table.actions"]}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {snapshots.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">{messages["admin.snapshots.empty"]}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
        <p>
          {messages["admin.snapshots.pagination.summary"]
            .replace("{page}", resolvedSearch.page.toString())
            .replace("{pages}", pageCount.toString())
            .replace("{total}", total.toString())
            .replace("{from}", showingFrom.toString())
            .replace("{to}", showingTo.toString())}
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
            {messages["admin.snapshots.pagination.prev"]}
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
            {messages["admin.snapshots.pagination.next"]}
          </Link>
        </div>
      </div>
    </div>
  );
}

