import Link from "next/link";
import { loadCalibrationStats } from "@/src/server/admin/calibrationService";
import type { Locale } from "@/i18n";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ playbook?: string; profile?: string; days?: string; assetId?: string }>;
};

const ALLOWED_DAYS = ["7", "30", "90"];

export default async function PlaybookCalibrationPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const query = (await searchParams) ?? {};
  const playbook = query.playbook ?? "gold-swing";
  const profile = query.profile ?? "swing";
  const days = ALLOWED_DAYS.includes(query.days ?? "") ? Number(query.days) : 30;
  const assetId = query.assetId ?? "gold";

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
              href={`/${locale}/admin/playbooks/calibration?playbook=${playbook}&profile=${profile}&days=${value}&assetId=${assetId}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                Number(value) === days ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {value} Tage
            </Link>
          ))}
        </div>
        <div className="flex gap-3 text-xs">
          <a
            className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
            href={`/api/admin/playbooks/calibration/export?playbook=${playbook}&profile=${profile}&days=${days}&assetId=${assetId}&format=csv`}
          >
            Export CSV
          </a>
          <a
            className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
            href={`/api/admin/playbooks/calibration/export?playbook=${playbook}&profile=${profile}&days=${days}&assetId=${assetId}&format=json`}
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Recent graded setups</h2>
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
