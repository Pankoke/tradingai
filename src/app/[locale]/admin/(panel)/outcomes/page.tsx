import Link from "next/link";
import type { Locale } from "@/i18n";
import { loadOutcomeStats } from "@/src/server/admin/outcomeService";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ days?: string; assetId?: string }>;
};

const ALLOWED_DAYS = ["7", "30", "90"];

export default async function OutcomesPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const query = (await searchParams) ?? {};
  const days = ALLOWED_DAYS.includes(query.days ?? "") ? Number(query.days) : 30;
  const assetId = query.assetId;

  const stats = await loadOutcomeStats({ days, assetId });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Outcomes</h1>
        <p className="text-sm text-slate-300">
          Read-only Outcome Tracking fǬr SWING / 1D. Fenster: letzte {days} Tage{assetId ? `, Asset: ${assetId}` : ""}.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {ALLOWED_DAYS.map((value) => (
            <Link
              key={value}
              href={`/${locale}/admin/outcomes?days=${value}${assetId ? `&assetId=${assetId}` : ""}`}
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
            href={`/api/admin/outcomes/export?days=${days}${assetId ? `&assetId=${assetId}` : ""}&format=csv`}
          >
            Export CSV
          </a>
          <a
            className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
            href={`/api/admin/outcomes/export?days=${days}${assetId ? `&assetId=${assetId}` : ""}&format=json`}
          >
            Export JSON
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Outcome Distribution (per Grade)">
          <div className="space-y-2 text-sm text-slate-200">
            {Object.entries(stats.byGrade).map(([grade, bucket]) => (
              <div key={grade} className="rounded bg-slate-900/60 px-3 py-2">
                <div className="flex justify-between text-xs uppercase text-slate-400">
                  <span>Grade {grade}</span>
                  <span>
                    TP:{bucket.hit_tp} / SL:{bucket.hit_sl} / Exp:{bucket.expired} / Amb:{bucket.ambiguous} / Open:
                    {bucket.open}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Rates">
          <div className="space-y-2 text-sm text-slate-200">
            <Metric label="Win-Rate (TP vs SL)" value={formatRate(stats.winRate)} />
            <Metric label="Expired Anteil" value={formatRate(stats.expiredShare)} />
            <Metric label="Ambiguous Anteil" value={formatRate(stats.ambiguousShare)} />
            <Metric label="Samples" value={`${Object.values(stats.totals).reduce((a, b) => a + b, 0)}`} />
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Kuerzlich evaluierte Setups</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-900/60">
              <tr>
                {["Evaluated", "Asset", "Grade", "Type", "Outcome", "Bars"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stats.recent.map((row) => (
                <tr key={`${row.snapshotId}-${row.setupId}`} className="hover:bg-slate-900/50">
                  <td className="px-3 py-2">
                    {row.evaluatedAt ? row.evaluatedAt.toISOString().slice(0, 19).replace("T", " ") : "-"}
                  </td>
                  <td className="px-3 py-2">{row.assetSymbol ?? row.assetId}</td>
                  <td className="px-3 py-2 font-semibold">{row.setupGrade ?? "-"}</td>
                  <td className="px-3 py-2">{row.setupType ?? "-"}</td>
                  <td className="px-3 py-2 uppercase font-semibold">{row.outcomeStatus}</td>
                  <td className="px-3 py-2">{row.barsToOutcome ?? "-"}</td>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function formatRate(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}%`;
}
