import Link from "next/link";
import clsx from "clsx";
import { countAssets } from "@/src/server/repositories/assetRepository";
import {
  countAllEvents,
  countUpcomingEvents,
  listHighImpactUpcomingEvents,
  type Event,
} from "@/src/server/repositories/eventRepository";
import { listRecentSnapshots } from "@/src/server/repositories/perceptionSnapshotRepository";
import { getMarketDataHealth } from "@/src/server/admin/marketDataHealth";
import type { MarketDataStatus } from "@/src/server/admin/marketDataHealth";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";

type Props = {
  params: Promise<{ locale: string }>;
};

type SnapshotStatus = "fresh" | "stale" | "critical";

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_48 = HOURS_24 * 2;
const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

const MARKET_STATUS_WEIGHT: Record<MarketDataStatus, number> = {
  fresh: 0,
  stale: 1,
  critical: 2,
};

const MARKET_STATUS_TONE: Record<MarketDataStatus, string> = {
  fresh: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  stale: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

function formatDate(date: string | Date, locale: Locale): string {
  const formatterLocale = locale === "de" ? "de-DE" : "en-US";
  return new Date(date).toLocaleString(formatterLocale);
}

function getSnapshotStatus(snapshotTime?: Date | string): SnapshotStatus {
  if (!snapshotTime) return "critical";
  const age = Date.now() - new Date(snapshotTime).getTime();
  if (age <= HOURS_24) return "fresh";
  if (age <= HOURS_48) return "stale";
  return "critical";
}

function getAffectedAssetsCount(event: Event): number | null {
  const assets = event.affectedAssets;
  if (Array.isArray(assets)) {
    return assets.length;
  }
  if (assets && typeof assets === "object") {
    return Object.keys(assets as Record<string, unknown>).length;
  }
  return null;
}

function formatDelay(delayMs: number | null, messages: typeof enMessages): string {
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
}

export default async function AdminDashboardPage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const snapshotMessages = {
    cardTitle: messages["admin.dashboard.snapshots.cardTitle"],
    listTitle: messages["admin.dashboard.snapshots.listTitle"],
    empty: messages["admin.dashboard.snapshots.empty"],
    status: {
      fresh: messages["admin.dashboard.snapshots.status.fresh"],
      stale: messages["admin.dashboard.snapshots.status.stale"],
      critical: messages["admin.dashboard.snapshots.status.critical"],
    },
    viewAll: messages["admin.dashboard.snapshots.viewAll"],
  };
  const eventCardMessages = {
    highImpactTitle: messages["admin.dashboard.events.highImpactTitle"],
    empty: messages["admin.dashboard.events.empty"],
    impactLabel: messages["admin.dashboard.events.impactLabel"],
    manage: messages["admin.dashboard.events.manage"],
  };
  const assetCardMessages = {
    manage: messages["admin.dashboard.assets.manage"],
  };
  const marketDataCardMessages = {
    title: messages["admin.dashboard.marketdataHealth.title"],
    viewDetails: messages["admin.dashboard.marketdataHealth.viewDetails"],
    provider: {
      yahoo: messages["admin.marketdata.provider.yahoo"],
      binance: messages["admin.marketdata.provider.binance"],
      polygon: "Polygon",
    } as Partial<Record<string, string>>,
    status: {
      fresh: messages["admin.common.status.fresh"],
      stale: messages["admin.common.status.stale"],
      critical: messages["admin.common.status.critical"],
    },
  };
  const [assetsCount, eventsCount, upcomingEvents, snapshots, highImpactEvents, marketDataHealth] = await Promise.all([
    countAssets(),
    countAllEvents(),
    countUpcomingEvents(),
    listRecentSnapshots(5),
    listHighImpactUpcomingEvents(),
    getMarketDataHealth(),
  ]);
  const latestSnapshot = snapshots[0];
  const snapshotStatus = getSnapshotStatus(latestSnapshot?.snapshotTime);
  const statusTone =
    snapshotStatus === "fresh"
      ? "bg-emerald-400/20 text-emerald-200 border-emerald-500/40"
      : snapshotStatus === "stale"
        ? "bg-amber-400/20 text-amber-200 border-amber-500/40"
        : "bg-rose-400/20 text-rose-200 border-rose-500/40";

  const providerOverview = Object.values(
    marketDataHealth.providerSummaries.reduce<Record<string, (typeof marketDataHealth.providerSummaries)[number]>>(
      (acc, summary) => {
        const existing = acc[summary.provider];
        if (!existing) {
          acc[summary.provider] = summary;
          return acc;
        }
        const existingWeight = MARKET_STATUS_WEIGHT[existing.status];
        const currentWeight = MARKET_STATUS_WEIGHT[summary.status];
        if (currentWeight > existingWeight) {
          acc[summary.provider] = summary;
          return acc;
        }
        if (currentWeight === existingWeight) {
          const existingDelay = existing.delayMs ?? Number.POSITIVE_INFINITY;
          const currentDelay = summary.delayMs ?? Number.POSITIVE_INFINITY;
          if (currentDelay > existingDelay) {
            acc[summary.provider] = summary;
          }
        }
        return acc;
      },
      {},
    ),
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400">Monitoring für Snapshots, Events und Assets.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Aktive Assets</p>
          <p className="mt-2 text-3xl font-semibold text-white">{assetsCount}</p>
          <Link className="mt-4 inline-flex text-sm text-sky-300 hover:text-sky-100" href={`/${locale}/admin/assets`}>
            {assetCardMessages.manage}
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Events gesamt</p>
          <p className="mt-2 text-3xl font-semibold text-white">{eventsCount}</p>
          <p className="text-sm text-slate-400">Davon nächste 7 Tage: {upcomingEvents}</p>
          <Link className="mt-2 inline-flex text-xs text-sky-300 hover:text-sky-100" href={`/${locale}/admin/events`}>
            {eventCardMessages.manage}
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{snapshotMessages.cardTitle}</p>
              <Link href={`/${locale}/admin/snapshots`} className="text-xs text-sky-300 hover:text-sky-100">
                {snapshotMessages.viewAll}
              </Link>
            </div>
            <span className={clsx("rounded-full border px-3 py-1 text-xs font-semibold", statusTone)}>
              {snapshotMessages.status[snapshotStatus]}
            </span>
          </div>
          {snapshots.length === 0 ? (
            <p className="mt-2 text-sm text-amber-300">{snapshotMessages.empty}</p>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{snapshotMessages.listTitle}</p>
              <ul className="space-y-2">
                {snapshots.map((snapshot, index) => (
                  <li
                    key={snapshot.id}
                    className={clsx(
                      "rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-sm",
                      index === 0 && "border-sky-500/60 bg-slate-800/60",
                    )}
                  >
                    <div className="flex items-center justify-between text-slate-100">
                      <p className="font-semibold">{snapshot.label ?? "Snapshot"}</p>
                      <span className="text-xs text-slate-400">{snapshot.dataMode}</span>
                    </div>
                    <p className="text-xs text-slate-400">{formatDate(snapshot.snapshotTime, locale)}</p>
                    {typeof snapshot.generatedMs === "number" && (
                      <p className="text-[0.65rem] text-slate-500">Build: {snapshot.generatedMs} ms</p>
                    )}
                    {Array.isArray(snapshot.setups) && (
                      <p className="text-[0.65rem] text-slate-500">Setups: {snapshot.setups.length}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Systemstatus</p>
          <p className="mt-2 text-lg text-slate-200">Health Endpoint verfügbar</p>
          <a className="text-sm text-sky-300 hover:text-sky-100" href="/api/health/perception" target="_blank">
            Health öffnen
          </a>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{marketDataCardMessages.title}</p>
            <span
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                MARKET_STATUS_TONE[marketDataHealth.overallStatus],
              )}
            >
              {marketDataCardMessages.status[marketDataHealth.overallStatus]}
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {providerOverview.map((summary) => (
              <li
                key={`${summary.provider}-${summary.timeframe}`}
                className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-2"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {marketDataCardMessages.provider[summary.provider] ?? summary.provider} · {summary.timeframe}
                  </p>
                  <span
                    className={clsx(
                      "rounded-full border px-2 py-0.5 text-[0.65rem]",
                      MARKET_STATUS_TONE[summary.status],
                    )}
                  >
                    {marketDataCardMessages.status[summary.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {summary.lastCandleAt
                    ? new Date(summary.lastCandleAt).toLocaleString(locale === "de" ? "de-DE" : "en-US")
                    : messages["admin.marketdata.delay.unknown"]}
                  {" · "}
                  {formatDelay(summary.delayMs, messages)}
                </p>
              </li>
            ))}
          </ul>
          <Link
            className="mt-3 inline-flex text-xs text-sky-300 hover:text-sky-100"
            href={`/${locale}/admin/marketdata`}
          >
            {marketDataCardMessages.viewDetails}
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 xl:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{eventCardMessages.highImpactTitle}</p>
          {highImpactEvents.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">{eventCardMessages.empty}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {highImpactEvents.map((event) => {
                const affectedCount = getAffectedAssetsCount(event);
                return (
                  <li key={event.id} className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-100">{event.title}</p>
                      <span className="rounded-full border border-rose-400/40 bg-rose-400/20 px-2 py-0.5 text-xs text-rose-200">
                        {eventCardMessages.impactLabel}: {event.impact}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{formatDate(event.scheduledAt, locale)}</p>
                    {affectedCount !== null && (
                      <p className="text-[0.65rem] text-slate-500">Assets: {affectedCount}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
