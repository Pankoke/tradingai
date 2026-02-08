import clsx from "clsx";
import type { Locale } from "@/i18n";
import { getMarketDataHealth } from "@/src/server/admin/marketDataHealth";
import type { MarketDataStatus } from "@/src/server/admin/marketDataHealth";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { getLatestFreshnessRuns } from "@/src/server/admin/freshnessAuditService";
import Link from "next/link";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import { buildDataMonitoringRelatedLinks } from "@/src/components/admin/relatedLinks";

type Props = {
  params: Promise<{ locale: string }>;
};

const STATUS_TONE: Record<MarketDataStatus, string> = {
  fresh: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  stale: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

export default async function AdminMarketDataPage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const [health, freshnessRuns] = await Promise.all([
    getMarketDataHealth(),
    getLatestFreshnessRuns({
      actions: ["snapshot_build", "perception_intraday", "outcomes.evaluate"],
      limitPerAction: 1,
    }),
  ]);

  const statusMessages = {
    fresh: messages["admin.common.status.fresh"],
    stale: messages["admin.common.status.stale"],
    critical: messages["admin.common.status.critical"],
  };

  const providerLabelMap: Record<string, string> = {
    yahoo: messages["admin.marketdata.provider.yahoo"],
    twelvedata: messages["admin.marketdata.provider.twelvedata"] ?? "TwelveData",
    finnhub: messages["admin.marketdata.provider.finnhub"] ?? "Finnhub",
    derived: messages["admin.marketdata.provider.derived"] ?? "Derived",
  };

  const formatDate = (value: Date | null): string =>
    value ? new Date(value).toLocaleString(locale === "de" ? "de-DE" : "en-US") : messages["admin.marketdata.delay.unknown"];

  const formatDelay = (delayMs: number | null): string => {
    if (delayMs == null) {
      return messages["admin.marketdata.delay.unknown"];
    }
    if (delayMs < MS_HOUR) {
      const minutes = Math.max(1, Math.round(delayMs / MS_MINUTE));
      return messages["admin.marketdata.delay.minutes"].replace("{value}", minutes.toString());
    }
    if (delayMs < MS_DAY) {
      const hours = Math.max(1, Math.round(delayMs / MS_HOUR));
      return messages["admin.marketdata.delay.hours"].replace("{value}", hours.toString());
    }
    const days = Math.max(1, Math.round(delayMs / MS_DAY));
    return messages["admin.marketdata.delay.days"].replace("{value}", days.toString());
  };
  const related = buildDataMonitoringRelatedLinks(locale, {
    snapshots: messages["admin.nav.snapshots"],
    marketDataHealth: messages["admin.nav.marketdataHealth"],
    coverage: messages["admin.nav.coverage"],
    healthReports: messages["admin.nav.healthReports"],
  });

  return (
    <div className="space-y-8">
      <AdminSectionHeader
        title={messages["admin.marketdata.title"]}
        description={messages["admin.marketdata.subtitle"]}
        relatedLabel={messages["admin.section.related"]}
        links={related}
        currentKey="marketDataHealth"
        notice={messages["admin.marketdata.notice"]}
        variant="info"
      />

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{messages["admin.marketdata.provider.heading"]}</p>
            <p className="text-lg text-slate-200">
              {messages["admin.marketdata.provider.summaryLabel"].replace(
                "{status}",
                statusMessages[health.overallStatus],
              )}
            </p>
          </div>
          <span className={clsx("rounded-full border px-3 py-1 text-xs font-semibold", STATUS_TONE[health.overallStatus])}>
            {statusMessages[health.overallStatus]}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">{messages["admin.marketdata.table.provider"]}</th>
                <th className="px-4 py-3">{messages["admin.marketdata.table.timeframe"]}</th>
                <th className="px-4 py-3">{messages["admin.marketdata.table.last"]}</th>
                <th className="px-4 py-3">{messages["admin.marketdata.table.delay"]}</th>
                <th className="px-4 py-3">{messages["admin.marketdata.table.status"]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-200">
              {health.providerSummaries.map((summary) => (
                <tr key={`${summary.provider}-${summary.timeframe}`}>
                  <td className="px-4 py-3 font-semibold">{providerLabelMap[summary.provider] ?? summary.provider}</td>
                  <td className="px-4 py-3">{summary.timeframe}</td>
                  <td className="px-4 py-3">{formatDate(summary.lastCandleAt)}</td>
                  <td className="px-4 py-3">{formatDelay(summary.delayMs)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("rounded-full border px-2 py-0.5 text-xs", STATUS_TONE[summary.status])}>
                      {statusMessages[summary.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Latest Gate Results</p>
            <p className="text-sm text-slate-400">Freshness-Gates aus den letzten Cron-Runs</p>
          </div>
          <Link href={`/${locale}/admin/audit?freshness=1`} className="text-sm text-sky-300 hover:text-sky-100">
            {messages["admin.audit.title"]}
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Gate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Skipped</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-200">
              {freshnessRuns.map((run) => {
                const labelMap: Record<string, string> = {
                  perception_swing: "Perception Swing (Daily)",
                  snapshot_build: "Perception Swing (Daily)",
                  perception_intraday: "Perception Intraday",
                  outcomes: "Outcomes Evaluate",
                };
                const label = run.gate && labelMap[run.gate] ? labelMap[run.gate] : run.gate ?? run.action;
                return (
                  <tr key={`${run.action}-${run.timestamp.toString()}`}>
                    <td className="px-4 py-3 font-semibold">
                      <div>{label}</div>
                      <div className="text-xs text-slate-500">{run.gate ?? run.action}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "rounded-full border px-2 py-0.5 text-xs",
                          run.freshnessStatus === "ok" ? STATUS_TONE.fresh : STATUS_TONE.stale,
                        )}
                      >
                        {run.freshnessStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">{run.skippedCount ?? 0}</td>
                    <td className="px-4 py-3">
                      {new Date(run.timestamp).toLocaleString(locale === "de" ? "de-DE" : "en-US")}
                    </td>
                  </tr>
                );
              })}
              {freshnessRuns.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={4}>
                    Keine Freshness-Daten vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{messages["admin.marketdata.staleAssets.title"]}</p>
            <p className="text-sm text-slate-400">{messages["admin.marketdata.staleAssets.subtitle"]}</p>
          </div>
        </div>

        {health.staleAssets.length === 0 ? (
          <p className="text-sm text-slate-400">{messages["admin.marketdata.staleAssets.empty"]}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">{messages["admin.marketdata.table.symbol"]}</th>
                  <th className="px-4 py-3">{messages["admin.marketdata.table.provider"]}</th>
                  <th className="px-4 py-3">{messages["admin.marketdata.table.timeframe"]}</th>
                  <th className="px-4 py-3">{messages["admin.marketdata.table.last"]}</th>
                  <th className="px-4 py-3">{messages["admin.marketdata.table.delay"]}</th>
                  <th className="px-4 py-3">{messages["admin.marketdata.table.status"]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-200">
                {health.staleAssets.map((entry) => (
                  <tr key={`${entry.assetId}-${entry.provider}-${entry.timeframe}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{entry.symbol}</div>
                      <div className="text-xs text-slate-500">{entry.assetClass}</div>
                    </td>
                    <td className="px-4 py-3">{providerLabelMap[entry.provider] ?? entry.provider}</td>
                    <td className="px-4 py-3">{entry.timeframe}</td>
                    <td className="px-4 py-3">{formatDate(entry.lastCandleAt)}</td>
                    <td className="px-4 py-3">{formatDelay(entry.delayMs)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("rounded-full border px-2 py-0.5 text-xs", STATUS_TONE[entry.status])}>
                        {statusMessages[entry.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

