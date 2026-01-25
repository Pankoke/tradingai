import Link from "next/link";
import type { Locale } from "@/i18n";
import type { ArtifactMeta } from "@/lib/artifacts/storage";
import { aggregatePlaybooks, loadLatestOutcomeReport } from "./lib";
import { ArtifactHealthNotice } from "@/src/components/admin/ArtifactHealthNotice";

const allowedDays = ["30", "60", "180"];

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    timeframe?: string;
    label?: string;
    minClosed?: string;
    days?: string;
    includeOpenOnly?: string;
  }>;
};

export default async function PlaybooksOverviewPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const locale = (resolvedParams.locale as Locale | undefined) ?? "en";
  const query = (await searchParams) ?? {};
  const timeframeFilter = (query.timeframe ?? "all").toLowerCase();
  const labelFilter = (query.label ?? "all").toLowerCase();
  const minClosed = Number.isFinite(Number(query.minClosed)) ? Number(query.minClosed) : 20;
  const includeOpenOnly = query.includeOpenOnly === "1";
  const days = allowedDays.includes(query.days ?? "") ? query.days! : "60";

  const loaded = await loadLatestOutcomeReport();
  if (!loaded) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-white">Playbooks Overview (Swing)</h1>
        <p className="text-slate-300 text-sm">
          Kein Phase-1 Outcome-Artefakt gefunden. Bitte ausführen: <code>npm run phase1:analyze:swing -- --days=60</code>
        </p>
      </div>
    );
  }

  const { report, meta } = loaded;

  const rows = aggregatePlaybooks(report, {
    timeframe: timeframeFilter,
    label: labelFilter,
    minClosed,
    includeOpenOnly,
  });

  return (
    <div className="space-y-6">
      <ArtifactHealthNotice source={meta.source} generatedAt={report.generatedAt} windowDays={report.params?.days} />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Playbooks Overview (Swing)</h1>
        <MetaBox meta={meta} report={report} />
        <div className="flex flex-wrap gap-2 text-xs">
          {allowedDays.map((d) => (
            <Link
              key={d}
              href={`/${locale}/admin/playbooks?days=${d}${timeframeFilter ? `&timeframe=${timeframeFilter}` : ""}${
                labelFilter ? `&label=${labelFilter}` : ""
              }${includeOpenOnly ? "&includeOpenOnly=1" : ""}${minClosed ? `&minClosed=${minClosed}` : ""}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                d === days ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {d} Tage
            </Link>
          ))}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Totals">
          <SummaryMetric label="Outcomes" value={report.overall.outcomesTotal} />
          <SummaryMetric label="Closed" value={report.overall.closedCount} />
          <SummaryMetric label="Open" value={report.overall.openCount} />
        </SummaryCard>
        <SummaryCard title="Quality">
          <SummaryMetric label="Winrate (tp/(tp+sl))" value={formatRate(report.overall.tpCount, report.overall.slCount)} />
          <SummaryMetric label="Close Rate" value={formatRateFromValue(report.overall.closeRate)} />
          <SummaryMetric label="Expired" value={report.overall.expiredCount ?? 0} />
        </SummaryCard>
        <SummaryCard title="Status">
          <SummaryMetric label="TP" value={report.overall.tpCount} />
          <SummaryMetric label="SL" value={report.overall.slCount} />
          <SummaryMetric label="Ambiguous" value={report.overall.ambiguousCount ?? 0} />
        </SummaryCard>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          {["all", "1d", "1w"].map((tf) => (
            <Link
              key={tf}
              href={`/${locale}/admin/playbooks?timeframe=${tf}${labelFilter ? `&label=${labelFilter}` : ""}${
                includeOpenOnly ? "&includeOpenOnly=1" : ""
              }${minClosed ? `&minClosed=${minClosed}` : ""}${days ? `&days=${days}` : ""}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                tf === timeframeFilter ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              TF {tf === "all" ? "alle" : tf.toUpperCase()}
            </Link>
          ))}
          {["all", "eod", "us_open", "morning", "(null)"].map((lb) => (
            <Link
              key={lb}
              href={`/${locale}/admin/playbooks?timeframe=${timeframeFilter}&label=${lb}${
                includeOpenOnly ? "&includeOpenOnly=1" : ""
              }${minClosed ? `&minClosed=${minClosed}` : ""}${days ? `&days=${days}` : ""}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                lb === labelFilter ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              Label {lb}
            </Link>
          ))}
          <Link
            href={`/${locale}/admin/playbooks?timeframe=${timeframeFilter}&label=${labelFilter}&includeOpenOnly=${
              includeOpenOnly ? "0" : "1"
            }${minClosed ? `&minClosed=${minClosed}` : ""}${days ? `&days=${days}` : ""}`}
            className="rounded bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
          >
            {includeOpenOnly ? "Playbooks mit nur Closed zeigen" : "Playbooks mit Open-only anzeigen"}
          </Link>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-900/60">
              <tr>
                {["Playbook", "Outcomes", "Closed", "Open", "TP", "SL", "Winrate", "CloseRate", "Flags"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.playbookId} className="hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-semibold text-slate-100">{row.playbookId}</td>
                  <td className="px-3 py-2">{row.outcomesTotal}</td>
                  <td className="px-3 py-2">{row.closedCount}</td>
                  <td className="px-3 py-2">{row.openCount}</td>
                  <td className="px-3 py-2">{row.tpCount}</td>
                  <td className="px-3 py-2">{row.slCount}</td>
                  <td className="px-3 py-2">{formatRate(row.tpCount, row.slCount)}</td>
                  <td className="px-3 py-2">{formatRateFromValue(row.closeRate)}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{row.flags.join(" | ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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

function MetaBox({ meta, report }: { meta: ArtifactMeta; report: { generatedAt?: string; params?: { days?: number } } }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300 space-y-1">
      <div className="font-semibold text-white">Data Source</div>
      <div className="flex flex-wrap gap-4">
        <span>source: {meta.source}</span>
        <span>artifact: {meta.artifactId}</span>
        <span>
          version: {meta.pickedVersion ?? "n/a"}
          {meta.fallbackReason ? ` (fallback: ${meta.fallbackReason})` : ""}
        </span>
        <span>generatedAt: {report.generatedAt ?? "n/a"}</span>
        <span>loadedAt: {meta.loadedAt}</span>
        {report.params?.days ? <span>window: {report.params.days} Tage</span> : null}
        {meta.byteSize ? <span>size: {meta.byteSize} bytes</span> : null}
      </div>
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
