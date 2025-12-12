import Link from "next/link";
import { countAssets } from "@/src/server/repositories/assetRepository";
import {
  countAllEvents,
  countUpcomingEvents,
} from "@/src/server/repositories/eventRepository";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";
import type { Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminDashboardPage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  const [assetsCount, eventsCount, upcomingEvents, latestSnapshot] = await Promise.all([
    countAssets(),
    countAllEvents(),
    countUpcomingEvents(),
    getLatestSnapshot(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400">Überwachung für Snapshots, Events und Assets.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Aktive Assets</p>
          <p className="mt-2 text-3xl font-semibold text-white">{assetsCount}</p>
          <Link className="mt-4 inline-flex text-sm text-sky-300 hover:text-sky-100" href={`/${locale}/admin/assets`}>
            Zu Assets →
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Events gesamt</p>
          <p className="mt-2 text-3xl font-semibold text-white">{eventsCount}</p>
          <p className="text-sm text-slate-400">Davon nächste 7 Tage: {upcomingEvents}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Letzter Snapshot</p>
          {latestSnapshot ? (
            <>
              <p className="mt-1 text-lg font-semibold text-white">{latestSnapshot.snapshot.label ?? "Snapshot"}</p>
              <p className="text-sm text-slate-400">
                {new Date(latestSnapshot.snapshot.snapshotTime).toLocaleString("de-DE")}
              </p>
              <p className="text-xs text-slate-500">Mode: {latestSnapshot.snapshot.dataMode}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-amber-300">Kein Snapshot vorhanden.</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Systemstatus</p>
          <p className="mt-2 text-lg text-slate-200">Health Endpoint verfügbar</p>
          <a className="text-sm text-sky-300 hover:text-sky-100" href="/api/health/perception" target="_blank">
            Health öffnen
          </a>
        </div>
      </div>
    </div>
  );
}
