import Link from "next/link";
import { loadCalibrationStats } from "@/src/server/admin/calibrationService";
import type { Locale } from "@/i18n";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ playbook?: string; profile?: string; days?: string; assetId?: string }>;
};

const ALLOWED_DAYS = ["7", "30", "90"];
const PLAYBOOK_OPTIONS = [
  { id: "gold-swing-v0.2", label: "Gold Swing" },
  { id: "index-swing-v0.1", label: "Index Swing" },
  { id: "crypto-swing-v0.1", label: "Crypto Swing" },
  { id: "fx-swing-v0.1", label: "FX Swing" },
  { id: "generic-swing-v0.1", label: "Generic Swing" },
];

export default async function PlaybookCalibrationPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const query = (await searchParams) ?? {};
  const playbook = query.playbook ?? "gold-swing-v0.2";
  const profile = query.profile ?? "swing";
  const days = ALLOWED_DAYS.includes(query.days ?? "") ? Number(query.days) : 30;
  const assetId = query.assetId;

  const stats = await loadCalibrationStats({ playbook, profile, days, assetId });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Playbook Calibration</h1>
        <p className="text-sm text-slate-300">
          Read-only Aggregation der letzten {days} Tage für {playbook} / {profile.toUpperCase()} / {assetId}.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {ALLOWED_DAYS.map((value) => (
            <Link
              key={value}
              href={`/${locale}/admin/playbooks/calibration?playbook=${playbook}&profile=${profile}&days=${value}${
                assetId ? `&assetId=${assetId}` : ""
              }`}
              className={`rounded-full px-3 py-1 font-semibold ${
                Number(value) === days ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {value} Tage
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {PLAYBOOK_OPTIONS.map((pb) => (
            <Link
              key={pb.id}
              href={`/${locale}/admin/playbooks/calibration?playbook=${pb.id}&profile=${profile}&days=${days}${
                assetId ? `&assetId=${assetId}` : ""
              }`}
              className={`rounded-full px-3 py-1 font-semibold ${
                pb.id === playbook ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {pb.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-3 text-xs">
          <a
            className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
            href={`/api/admin/playbooks/calibration/export?playbook=${playbook}&profile=${profile}&days=${days}${
              assetId ? `&assetId=${assetId}` : ""
            }&format=csv`}
          >
            Export CSV
          </a>
          <a
            className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
            href={`/api/admin/playbooks/calibration/export?playbook=${playbook}&profile=${profile}&days=${days}${
              assetId ? `&assetId=${assetId}` : ""
            }&format=json`}
          >
            Export JSON
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Grade Distribution">
          <div className="space-y-2 text-sm text-slate-200">
            {Object.entries(stats.gradeCounts).map(([grade, count]) => (
              <div key={grade} className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
                <span>{grade}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Event Classification">
          <div className="space-y-2 text-sm text-slate-200">
            {Object.entries(stats.eventModifierCounts).map(([key, count]) => (
              <div key={key} className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
                <span>{key}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Averages">
          <MetricList stats={stats.averages} />
        </Card>
        <Card title="Medians">
          <MetricList stats={stats.medians} />
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Type vs Grade">
          {stats.typeGradeCounts.length === 0 ? (
            <div className="text-sm text-slate-200">No data in selected window.</div>
          ) : (
            <div className="space-y-2 text-sm text-slate-200">
              {stats.typeGradeCounts.map((row) => (
                <div key={row.setupType} className="rounded bg-slate-900/60 px-3 py-2">
                  <div className="text-xs uppercase text-slate-400">{row.setupType}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    {Object.entries(row.grades).map(([g, c]) => (
                      <span key={g} className="rounded bg-slate-800 px-2 py-1">
                        {g}: {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Top NO_TRADE Reasons">
          {stats.noTradeReasons ? (
            <div className="space-y-2 text-sm text-slate-200">
              {stats.noTradeReasons.slice(0, 10).map((r) => (
                <div key={r.reason} className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
                  <span className="text-slate-300">{r.reason}</span>
                  <span className="font-semibold text-white">{r.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-200">No NO_TRADE reasons in window.</div>
          )}
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="NO_TRADE by Bias (10er Bins)">
          {stats.noTradeByBiasBin ? (
            <div className="space-y-2 text-sm text-slate-200">
              {stats.noTradeByBiasBin.map((bin) => (
                <div key={bin.bin} className="rounded bg-slate-900/60 px-3 py-2">
                  <div className="text-xs uppercase text-slate-400">Bias {bin.bin}–{bin.bin + 9}</div>
                  <div className="space-y-1 text-xs text-slate-300">
                    {bin.reasons.map((r) => (
                      <div key={r.reason} className="flex justify-between">
                        <span>{r.reason}</span>
                        <span className="font-semibold text-white">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-200">Keine NO_TRADE Daten fǬr Bias-Bins.</div>
          )}
        </Card>
        <Card title="NO_TRADE by Trend (10er Bins)">
          {stats.noTradeByTrendBin ? (
            <div className="space-y-2 text-sm text-slate-200">
              {stats.noTradeByTrendBin.map((bin) => (
                <div key={bin.bin} className="rounded bg-slate-900/60 px-3 py-2">
                  <div className="text-xs uppercase text-slate-400">Trend {bin.bin}–{bin.bin + 9}</div>
                  <div className="space-y-1 text-xs text-slate-300">
                    {bin.reasons.map((r) => (
                      <div key={r.reason} className="flex justify-between">
                        <span>{r.reason}</span>
                        <span className="font-semibold text-white">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-200">Keine NO_TRADE Daten fǬr Trend-Bins.</div>
          )}
        </Card>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-white">Score Summary by Grade</h2>
        {stats.scoreSummaryByGrade.length === 0 ? (
          <div className="text-sm text-slate-200">Keine Daten fǬr die aktuellen Filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
              <thead className="bg-slate-900/60">
                <tr>
                  {["Grade", "Count", "Bias p10/p50/p90", "Trend p10/p50/p90", "ScoreTotal p50", "Confidence p50"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stats.scoreSummaryByGrade.map((row) => (
                  <tr key={row.grade} className="hover:bg-slate-900/50">
                    <td className="px-3 py-2 font-semibold">{row.grade}</td>
                    <td className="px-3 py-2">{row.count}</td>
                    <td className="px-3 py-2">
                      {fmt(row.bias.p10)}/{fmt(row.bias.p50)}/{fmt(row.bias.p90)}
                    </td>
                    <td className="px-3 py-2">
                      {fmt(row.trend.p10)}/{fmt(row.trend.p50)}/{fmt(row.trend.p90)}
                    </td>
                    <td className="px-3 py-2">{fmt(row.scoreTotal.p50)}</td>
                    <td className="px-3 py-2">{fmt(row.confidence.p50)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Recent graded setups</h2>
        {stats.recent.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
            Keine Daten für die aktuellen Filter. Tipp: assetId leer lassen oder assetId=GC=F nutzen.
          </div>
        ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-900/60">
              <tr>
                {["Timestamp", "Asset", "TF", "Grade", "Type", "Trend", "Bias", "OF", "Sent", "Event"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.recent.map((setup) => (
                <tr key={`${setup.snapshotId}-${setup.id}`} className="hover:bg-slate-900/50">
                  <td className="px-3 py-2">{setup.snapshotCreatedAt?.slice(0, 19).replace("T", " ")}</td>
                  <td className="px-3 py-2">{setup.symbol}</td>
                  <td className="px-3 py-2">{setup.timeframe}</td>
                  <td className="px-3 py-2 font-semibold">{setup.setupGrade ?? "-"}</td>
                  <td className="px-3 py-2">{setup.setupType ?? "-"}</td>
                  <td className="px-3 py-2">{setup.rings?.trendScore ?? "-"}</td>
                  <td className="px-3 py-2">{setup.rings?.biasScore ?? "-"}</td>
                  <td className="px-3 py-2">{setup.rings?.orderflowScore ?? "-"}</td>
                  <td className="px-3 py-2">{setup.rings?.sentimentScore ?? "-"}</td>
                  <td className="px-3 py-2">{setup.eventModifier?.classification ?? "-"}</td>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MetricList({ stats }: { stats: Record<string, number | null> }) {
  return (
    <div className="space-y-1 text-sm text-slate-200">
      {Object.entries(stats).map(([key, value]) => (
        <div key={key} className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
          <span className="capitalize">{key}</span>
          <span className="font-semibold">{value ?? "-"}</span>
        </div>
      ))}
    </div>
  );
}

function fmt(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100) / 100}`;
}
