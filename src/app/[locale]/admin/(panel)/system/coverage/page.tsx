import clsx from "clsx";
import type { JSX } from "react";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { loadCoverageMatrix } from "@/src/server/admin/coverageService";
import { classifyTimeframeStatus, type TimeframeStatus } from "@/src/lib/admin/coverageRules";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import { buildDataMonitoringRelatedLinks } from "@/src/components/admin/relatedLinks";

type Props = {
  params: Promise<{ locale: string }>;
};

const STATUS_COLORS: Record<TimeframeStatus, string> = {
  ok: "bg-emerald-500/15 text-emerald-100 border border-emerald-400/40",
  stale: "bg-amber-500/15 text-amber-100 border border-amber-400/40",
  missing: "bg-rose-500/15 text-rose-100 border border-rose-400/40",
};

function formatAge(value: number | null): string {
  if (value == null) return "–";
  if (value < 90) return `${Math.round(value)}m`;
  const hours = value / 60;
  if (hours < 72) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${Math.round(days)}d`;
}

export default async function CoveragePage({ params }: Props): Promise<JSX.Element> {
  const localeParam = (await params).locale as Locale;
  const messages = localeParam === "de" ? deMessages : enMessages;
  const matrix = await loadCoverageMatrix();
  const related = buildDataMonitoringRelatedLinks(localeParam, {
    snapshots: messages["admin.nav.snapshots"],
    marketDataHealth: messages["admin.nav.marketdataHealth"],
    coverage: messages["admin.nav.coverage"],
    healthReports: messages["admin.nav.healthReports"],
  });

  const header = ["Asset", "Provider", "1W", "1D", "4H", "1H", "Profiles"];

  return (
    <div className="space-y-6 px-4 py-8">
      <AdminSectionHeader
        title={messages["admin.coverage.title"]}
        description={messages["admin.coverage.description"]}
        relatedLabel={messages["admin.section.related"]}
        links={related}
        currentKey="coverage"
        notice={messages["admin.coverage.notice"]}
        variant="info"
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
        <table className="min-w-full text-sm text-slate-100">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              {header.map((h) => (
                <th key={h} className="px-3 py-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {matrix.map((row) => (
              <tr key={row.assetId} className="hover:bg-slate-900/30">
                <td className="px-3 py-2">
                  <div className="font-semibold text-white">{row.symbol}</div>
                  <div className="text-xs text-slate-400">{row.displayName}</div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-300">{row.provider ?? row.timeframes["1D"]?.source ?? "—"}</td>
                {(["1W", "1D", "4H", "1H"] as const).map((tf) => {
                  const cell = row.timeframes[tf];
                  const status: TimeframeStatus = cell?.status ?? classifyTimeframeStatus(tf, null);
                  return (
                    <td key={tf} className="px-3 py-2">
                      <div className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_COLORS[status]}`}>
                        {status.toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {cell?.lastTimestamp ? new Date(cell.lastTimestamp).toISOString().slice(0, 16).replace("T", " ") : "—"}
                      </div>
                      <div className="text-[11px] text-slate-500">Age: {formatAge(cell?.ageMinutes ?? null)}</div>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-xs">
                  <div className="flex flex-wrap gap-1">
                    <ProfileBadge label="Swing" active={row.profiles.swing} />
                    <ProfileBadge label="Intraday" active={row.profiles.intraday} />
                    <ProfileBadge label="Position" active={row.profiles.position} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        active ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-100" : "border border-slate-700 bg-slate-900/60 text-slate-400",
      )}
    >
      {label}
    </span>
  );
}

