import clsx from "clsx";
import Link from "next/link";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { getSystemHealthReport } from "@/src/server/admin/systemHealth";
import { listAuditRuns } from "@/src/server/repositories/auditRunRepository";

type Props = {
  params: Promise<{ locale: string }>;
};

type Status = "ok" | "warning" | "critical";

const STATUS_TONES: Record<Status, string> = {
  ok: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40",
  warning: "bg-amber-500/15 text-amber-200 border border-amber-400/40",
  critical: "bg-rose-500/15 text-rose-200 border border-rose-400/40",
};

function formatNumber(locale: Locale, value: number): string {
  return value.toLocaleString(locale === "de" ? "de-DE" : "en-US");
}

function formatBytes(value?: number): string {
  if (!value) return "–";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

const ACTION_LABEL_KEYS = [
  { value: "snapshot_build", key: "admin.audit.actions.snapshot_build" },
  { value: "marketdata_sync", key: "admin.audit.actions.marketdata_sync" },
  { value: "bias_sync", key: "admin.audit.actions.bias_sync" },
];

const SOURCE_LABEL_KEYS = [
  { value: "admin", key: "admin.audit.sources.admin" },
  { value: "cron", key: "admin.audit.sources.cron" },
  { value: "ui", key: "admin.audit.sources.ui" },
];

function getActionLabel(action: string, messages: typeof enMessages): string {
  const entry = ACTION_LABEL_KEYS.find((item) => item.value === action);
  return entry ? (messages[entry.key as keyof typeof enMessages] ?? action) : action;
}

function getSourceLabel(source: string, messages: typeof enMessages): string {
  const entry = SOURCE_LABEL_KEYS.find((item) => item.value === source);
  return entry ? (messages[entry.key as keyof typeof enMessages] ?? source) : source;
}

export default async function AdminSystemHealthPage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const [health, auditPreview] = await Promise.all([
    getSystemHealthReport(),
    listAuditRuns({ limit: 8 }),
  ]);
  const recentRuns = auditPreview.runs;

  const appStatus: Status = health.appHealth.ok ? "ok" : "critical";
  const dbStatus: Status = !health.dbHealth.ok
    ? "critical"
    : (health.dbHealth.pingMs ?? 0) > 250
      ? "warning"
      : "ok";

  const countRows = [
    {
      key: "snapshots",
      label: messages["admin.system.counts.snapshots"],
      total: health.counts.snapshotsTotal,
      last7d: health.counts.snapshotsLast7d,
    },
    {
      key: "items",
      label: messages["admin.system.counts.snapshotItems"],
      total: health.counts.snapshotItemsTotal,
      last7d: health.counts.snapshotItemsLast7d,
    },
    {
      key: "candles",
      label: messages["admin.system.counts.candles"],
      total: health.counts.candlesTotal,
      last7d: health.counts.candlesLast7d,
    },
    {
      key: "events",
      label: messages["admin.system.counts.events"],
      total: health.counts.eventsTotal,
      last7d: health.counts.eventsUpcoming7d,
      last7dLabel: messages["admin.system.counts.upcoming7d"],
    },
    {
      key: "assets",
      label: messages["admin.system.counts.assets"],
      total: health.counts.assetsTotal,
      last7d: health.counts.assetsActive,
      last7dLabel: messages["admin.system.counts.active"],
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
        <h1 className="text-3xl font-semibold text-white">{messages["admin.system.title"]}</h1>
        <p className="text-sm text-slate-400">{messages["admin.system.subtitle"]}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {messages["admin.system.app.title"]}
              </p>
              <p className="text-sm text-slate-400">{messages["admin.system.app.description"]}</p>
            </div>
            <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", STATUS_TONES[appStatus])}>
              {health.appHealth.ok ? messages["admin.system.status.ok"] : messages["admin.system.status.critical"]}
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">{messages["admin.system.app.endpoint"]}</dt>
              <dd className="truncate text-right text-slate-200">{health.appHealth.url}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">{messages["admin.system.app.statusCode"]}</dt>
              <dd className="text-slate-200">{health.appHealth.statusCode ?? "–"}</dd>
            </div>
            {health.appHealth.message && (
              <div>
                <dt className="text-slate-400">{messages["admin.system.app.message"]}</dt>
                <dd className="mt-1 rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300">
                  {health.appHealth.message}
                </dd>
              </div>
            )}
          </dl>
          <a
            href={health.appHealth.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-sm text-sky-300 hover:text-sky-100"
          >
            {messages["admin.system.app.linkLabel"]}
          </a>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {messages["admin.system.db.title"]}
              </p>
              <p className="text-sm text-slate-400">{messages["admin.system.db.description"]}</p>
            </div>
            <span className={clsx("rounded-full px-3 py-1 text-xs font-semibold", STATUS_TONES[dbStatus])}>
              {dbStatus === "ok"
                ? messages["admin.system.status.ok"]
                : dbStatus === "warning"
                  ? messages["admin.system.status.warning"]
                  : messages["admin.system.status.critical"]}
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">{messages["admin.system.db.ping"]}</dt>
              <dd className="text-slate-200">{health.dbHealth.pingMs?.toFixed(1) ?? "–"} ms</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">{messages["admin.system.db.now"]}</dt>
              <dd className="text-slate-200">{health.dbHealth.nowMs?.toFixed(1) ?? "–"} ms</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">{messages["admin.system.db.readTest"]}</dt>
              <dd className="text-slate-200">{health.dbHealth.readTestMs?.toFixed(1) ?? "–"} ms</dd>
            </div>
            {health.dbHealth.error && (
              <div className="text-xs text-rose-300">{health.dbHealth.error}</div>
            )}
          </dl>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {messages["admin.system.counts.title"]}
            </p>
            <p className="text-sm text-slate-400">{messages["admin.system.counts.subtitle"]}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {countRows.map((row) => (
            <div key={row.key} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{row.label}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-white">{formatNumber(locale, row.total)}</span>
                <span className="text-xs text-slate-400">{messages["admin.system.counts.total"]}</span>
              </div>
              <p className="text-xs text-slate-400">
                {row.last7dLabel ?? messages["admin.system.counts.last7d"]}:{" "}
                <span className="text-slate-200">{formatNumber(locale, row.last7d)}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {messages["admin.system.recentRuns.title"]}
            </p>
            <p className="text-sm text-slate-400">{messages["admin.system.recentRuns.subtitle"]}</p>
          </div>
          <Link
            href={`/${locale}/admin/audit`}
            className="text-sm text-sky-300 hover:text-sky-100"
          >
            {messages["admin.system.recentRuns.viewAll"]}
          </Link>
        </div>
        {recentRuns.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{messages["admin.system.recentRuns.empty"]}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentRuns.map((run) => (
              <div key={run.id} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 text-sm text-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {getActionLabel(run.action, messages)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {getSourceLabel(run.source, messages)} ·{" "}
                      {run.createdAt instanceof Date
                        ? run.createdAt.toLocaleString(locale === "de" ? "de-DE" : "en-US")
                        : new Date(run.createdAt).toLocaleString(locale === "de" ? "de-DE" : "en-US")}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
                      STATUS_TONES[run.ok ? "ok" : "critical"],
                    )}
                  >
                    {run.ok ? messages["admin.audit.status.ok"] : messages["admin.audit.status.fail"]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">{run.message ?? "–"}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {messages["admin.system.sizes.title"]}
            </p>
            <p className="text-sm text-slate-400">{messages["admin.system.sizes.description"]}</p>
          </div>
        </div>
        {health.sizes.available ? (
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <div className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-900/40 p-3">
              <span>{messages["admin.system.sizes.database"]}</span>
              <span className="font-semibold">{formatBytes(health.sizes.databaseBytes)}</span>
            </div>
            <div className="space-y-2">
              {health.sizes.tables &&
                Object.entries(health.sizes.tables).map(([table, size]) => (
                  <div
                    key={table}
                    className="flex items-center justify-between rounded-lg border border-slate-800/40 bg-slate-900/30 p-3"
                  >
                    <span>{table}</span>
                    <span className="font-mono text-sm text-slate-200">{formatBytes(size)}</span>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">{messages["admin.system.sizes.unavailable"]}</p>
        )}
      </section>

      <p className="text-xs text-slate-500">
        {messages["admin.system.generatedAt"]}:{" "}
        {new Date(health.generatedAt).toLocaleString(locale === "de" ? "de-DE" : "en-US")}
      </p>
    </div>
  );
}
