import Link from "next/link";
import type { Locale } from "@/i18n";
import { loadLatestOutcomeReport } from "../../playbooks/lib";
import {
  aggregateAssets,
  aggregateDecisions,
  aggregatePlaybooks,
  computeIntegrity,
  computeTotals,
  filterRows,
  type BucketRow,
} from "./lib";

type PageProps = {
  params: { locale: string };
  searchParams?: { timeframe?: string; label?: string; minClosed?: string; includeOpenOnly?: string };
};

export default async function OutcomesOverviewPage({ params, searchParams }: PageProps) {
  const locale = (params.locale as Locale | undefined) ?? "en";
  const query = searchParams ?? {};
  const timeframe = (query.timeframe ?? "all").toLowerCase();
  const label = (query.label ?? "all").toLowerCase();
  const minClosed = Number.isFinite(Number(query.minClosed)) ? Number(query.minClosed) : 20;
  const includeOpenOnly = query.includeOpenOnly === "1";

  const report = await loadLatestOutcomeReport();
  if (!report) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-white">Outcomes Overview (Swing)</h1>
        <p className="text-slate-300 text-sm">
          Kein Phase-1 Outcome-Artefakt gefunden. Bitte ausführen: <code>npm run phase1:analyze:swing -- --days=60</code>
        </p>
      </div>
    );
  }

  const filtered = filterRows(report, { timeframe, label, minClosed, includeOpenOnly });
  const totals = computeTotals(filtered);
  const playbooks = aggregatePlaybooks(filtered, { timeframe, label, minClosed, includeOpenOnly }).slice(0, 10);
  const assets = aggregateAssets(filtered, { timeframe, label, minClosed, includeOpenOnly }).slice(0, 10);
  const decisions = aggregateDecisions(filtered);
  const integrity = computeIntegrity(filtered, (report as unknown as { fallbackUsedCount?: number }).fallbackUsedCount ?? null);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Outcomes Overview (Swing)</h1>
        <p className="text-sm text-slate-300">
          Artefakt: swing-outcome-analysis-latest (version {report.version}), generatedAt {report.generatedAt}, window{" "}
          {report.params.days} Tage.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {["all", "1d", "1w"].map((tf) => (
            <Link
              key={tf}
              href={`/${locale}/admin/outcomes/overview?timeframe=${tf}${label ? `&label=${label}` : ""}${
                includeOpenOnly ? "&includeOpenOnly=1" : ""
              }${minClosed ? `&minClosed=${minClosed}` : ""}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                tf === timeframe ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              TF {tf === "all" ? "alle" : tf.toUpperCase()}
            </Link>
          ))}
          {["all", "eod", "us_open", "morning", "(null)"].map((lb) => (
            <Link
              key={lb}
              href={`/${locale}/admin/outcomes/overview?timeframe=${timeframe}&label=${lb}${
                includeOpenOnly ? "&includeOpenOnly=1" : ""
              }${minClosed ? `&minClosed=${minClosed}` : ""}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                lb === label ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              Label {lb}
            </Link>
          ))}
          <Link
            href={`/${locale}/admin/outcomes/overview?timeframe=${timeframe}&label=${label}&includeOpenOnly=${
              includeOpenOnly ? "0" : "1"
            }${minClosed ? `&minClosed=${minClosed}` : ""}`}
            className="rounded bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
          >
            {includeOpenOnly ? "Playbooks mit nur Closed zeigen" : "Playbooks mit Open-only anzeigen"}
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Totals">
          <SummaryMetric label="Outcomes" value={totals.outcomesTotal} />
          <SummaryMetric label="Closed" value={totals.closed} />
          <SummaryMetric label="Open" value={totals.open} />
        </SummaryCard>
        <SummaryCard title="Quality">
          <SummaryMetric label="Winrate (tp/(tp+sl))" value={formatRate(totals.tp, totals.sl)} />
          <SummaryMetric label="Close Rate" value={formatRateFromValue(totals.closeRate)} />
        </SummaryCard>
        <SummaryCard title="Status">
          <SummaryMetric label="TP" value={totals.tp} />
          <SummaryMetric label="SL" value={totals.sl} />
          <SummaryMetric label="Open" value={totals.open} />
        </SummaryCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <BucketTable title="Top Playbooks" rows={playbooks} />
        <BucketTable title="Top Assets" rows={assets} />
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-white">Decisions</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-900/60">
              <tr>
                {["Decision", "Outcomes", "Closed", "Open"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {decisions.map((row) => (
                <tr key={row.decision} className="hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-semibold text-slate-100">{row.decision}</td>
                  <td className="px-3 py-2">{row.outcomesTotal}</td>
                  <td className="px-3 py-2">{row.closed}</td>
                  <td className="px-3 py-2">{row.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold text-white">Integrity / Warnings</h2>
        <p className="text-xs text-slate-300">
          fallbackUsedCount: {integrity.fallbackUsedCount ?? 0}; missing playbookId: {integrity.missingPlaybook}; missing
          decision: {integrity.missingDecision}; missing grade: {integrity.missingGrade}
        </p>
        <div className="text-xs text-slate-400">
          Winrate = tp/(tp+sl); CloseRate = closed/outcomesTotal. Buckets mit low-sample (&lt;{minClosed} closed) werden
          standardmäßig ausgeblendet, außer sie sind mostly-open.
        </div>
        <div className="text-xs text-slate-400 flex gap-4">
          <Link href={`/${locale}/admin/playbooks`} className="text-emerald-300 hover:underline">
            Playbooks Overview
          </Link>
          <Link href={`/${locale}/admin/outcomes`} className="text-emerald-300 hover:underline">
            Outcomes Explorer
          </Link>
        </div>
      </section>
    </div>
  );
}

function BucketTable({ title, rows }: { title: string; rows: BucketRow[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-900/60">
            <tr>
              {["Key", "Outcomes", "Closed", "Open", "TP", "SL", "Winrate", "CloseRate", "Flags"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-900/50">
                <td className="px-3 py-2 font-semibold text-slate-100">{row.id}</td>
                <td className="px-3 py-2">{row.outcomesTotal}</td>
                <td className="px-3 py-2">{row.closed}</td>
                <td className="px-3 py-2">{row.open}</td>
                <td className="px-3 py-2">{row.tp}</td>
                <td className="px-3 py-2">{row.sl}</td>
                <td className="px-3 py-2">{formatRate(row.tp, row.sl)}</td>
                <td className="px-3 py-2">{formatRateFromValue(row.closeRate)}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{row.flags.join(" | ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-2 space-y-1 text-sm text-slate-200">{children}</div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number | string | null }) {
  const display =
    typeof value === "number" && !Number.isNaN(value)
      ? value
      : value === null || value === undefined
        ? "-"
        : value;
  return (
    <div className="flex justify-between text-slate-200">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{display}</span>
    </div>
  );
}

function formatRate(tp: number, sl: number): string {
  const denom = tp + sl;
  if (denom <= 0) return "n/a";
  return `${Math.round((tp / denom) * 100)}%`;
}

function formatRateFromValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}%`;
}
