import Link from "next/link";
import type { Locale } from "@/i18n";
import {
  aggregateByAsset,
  aggregateByPlaybook,
  filterBuckets,
  listPlaybooks,
  loadPerformanceReport,
  type AggregateRow,
} from "./utils";
import { OutcomesHeader } from "@/src/components/admin/outcomes/OutcomesHeader";
import { buildOutcomesRelatedLinks } from "@/src/components/admin/outcomes/relatedLinks";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ timeframe?: string; playbookId?: string; hideLowSample?: string }>;
};

const TIMEFRAME_CHOICES = [
  { value: "all", label: "Alle TF" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
];

export default async function SwingPerformancePage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const related = buildOutcomesRelatedLinks(locale, {
    explorer: messages["admin.outcomes.related.explorer"],
    overview: messages["admin.outcomes.related.overview"],
    diagnostics: messages["admin.outcomes.related.diagnostics"],
    engineHealth: messages["admin.outcomes.related.engineHealth"],
    swingPerformance: messages["admin.outcomes.related.swingPerformance"],
  });

  const query = (await searchParams) ?? {};
  const timeframe = (query.timeframe ?? "all").toLowerCase();
  const playbookId = query.playbookId ?? "";
  const hideLowSample = query.hideLowSample !== "0";

  const report = await loadPerformanceReport();
  if (!report) {
    return (
      <div className="space-y-3">
        <OutcomesHeader
          title={messages["admin.outcomes.header.swingPerformance.title"]}
          description={messages["admin.outcomes.header.swingPerformance.description"]}
          notice={messages["admin.outcomes.header.swingPerformance.notice"]}
          variant="legacy"
          related={related}
          currentKey="swingPerformance"
        />
        <p className="text-slate-300 text-sm">
          Kein Artefakt gefunden. Bitte zuerst ausfuehren: <code>npm run phase1:performance:swing -- --days=30</code>
        </p>
      </div>
    );
  }

  const buckets = filterBuckets(report, { timeframe, playbookId, hideLowSample });
  const playbooks = buildPlaybookFilters(listPlaybooks(report));
  const totals = aggregateTotals(buckets);
  const byPlaybook = aggregateByPlaybook(buckets);
  const byAsset = aggregateByAsset(buckets);

  return (
    <div className="space-y-6">
      <OutcomesHeader
        title={messages["admin.outcomes.header.swingPerformance.title"]}
        description={messages["admin.outcomes.header.swingPerformance.description"]}
        notice={messages["admin.outcomes.header.swingPerformance.notice"]}
        variant="legacy"
        related={related}
        currentKey="swingPerformance"
      />

      <header className="space-y-2">
        <p className="text-sm text-slate-300">
          Artefakt-basierte Uebersicht (Phase-1). Fenster: letzte {report.params.days} Tage. MinClosed: {" "}
          {report.params.minClosed}. Quelle: artifacts/phase1/swing-performance-breakdown-latest-v1.json
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {TIMEFRAME_CHOICES.map((tf) => (
            <Link
              key={tf.value}
              href={`/${locale}/admin/outcomes/swing-performance?timeframe=${tf.value}${
                playbookId ? `&playbookId=${playbookId}` : ""
              }${hideLowSample ? "" : "&hideLowSample=0"}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                tf.value === timeframe ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {tf.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {playbooks.map((pb) => (
            <Link
              key={pb.value}
              href={`/${locale}/admin/outcomes/swing-performance?timeframe=${timeframe}${
                pb.value ? `&playbookId=${pb.value}` : ""
              }${hideLowSample ? "" : "&hideLowSample=0"}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                pb.value === playbookId ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {pb.label}
            </Link>
          ))}
        </div>
        <div className="text-xs text-slate-300">
          <Link
            href={`/${locale}/admin/outcomes/swing-performance?timeframe=${timeframe}${
              playbookId ? `&playbookId=${playbookId}` : ""
            }${hideLowSample ? "&hideLowSample=0" : ""}`}
            className="rounded bg-slate-800 px-3 py-1 font-semibold hover:bg-slate-700"
          >
            {hideLowSample ? "Rows mit zu wenigen Closed anzeigen" : "Rows mit zu wenigen Closed ausblenden"}
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Outcomes">
          <SummaryMetric label="Outcomes" value={totals.outcomesTotal} />
          <SummaryMetric label="Closed" value={totals.closedCount} />
          <SummaryMetric label="Open" value={totals.openCount} />
        </SummaryCard>
        <SummaryCard title="Quality">
          <SummaryMetric label="Winrate (TP/(TP+SL))" value={formatRate(totals.winrateTpSl)} />
          <SummaryMetric label="Close Rate" value={formatRate(totals.closeRate)} />
          <SummaryMetric label="Expired" value={totals.expiredCount} />
        </SummaryCard>
        <SummaryCard title="Status Mix">
          <SummaryMetric label="TP" value={totals.tpCount} />
          <SummaryMetric label="SL" value={totals.slCount} />
          <SummaryMetric label="Ambiguous" value={totals.ambiguousCount} />
        </SummaryCard>
      </section>

      <DataTable title="By Playbook" rows={byPlaybook} hideLowSample={hideLowSample} />
      <DataTable title="By Asset" rows={byAsset} hideLowSample={hideLowSample} />

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
        <h2 className="text-sm font-semibold text-white">Meta</h2>
        <div className="grid gap-1 md:grid-cols-2">
          <div>generatedAt: {report.generatedAt}</div>
          <div>days: {report.params.days}</div>
          <div>minClosed: {report.params.minClosed}</div>
          <div>timeframes: {report.params.timeframes.join(", ")}</div>
          <div>labels: {report.params.labels.join(", ")}</div>
          {report.notes?.length ? <div>notes: {report.notes.join(" | ")}</div> : null}
        </div>
        <div className="mt-2 text-slate-400">
          Neu generieren: <code>npm run phase1:performance:swing -- --days={report.params.days}</code>
        </div>
      </section>
    </div>
  );
}

function DataTable({ title, rows, hideLowSample }: { title: string; rows: AggregateRow[]; hideLowSample: boolean }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-900/60">
            <tr>
              {["Key", "Outcomes", "Closed", "CloseRate", "TP", "SL", "Winrate", "Flags"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row) => (
              <tr key={row.key.id} className="hover:bg-slate-900/50">
                <td className="px-3 py-2 text-slate-100">{row.key.label}</td>
                <td className="px-3 py-2">{row.outcomesTotal}</td>
                <td className="px-3 py-2">{row.closedCount}</td>
                <td className="px-3 py-2">{formatRate(row.closeRate)}</td>
                <td className="px-3 py-2">{row.tpCount}</td>
                <td className="px-3 py-2">{row.slCount}</td>
                <td className="px-3 py-2">{formatRate(row.winrateTpSl)}</td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {row.flags.tooFewClosed && hideLowSample ? "Gefiltert (tooFewClosed)" : ""}
                  {row.flags.mostlyOpen ? (hideLowSample ? " | " : "") + "mostlyOpen" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
  const display = typeof value === "number" ? value : value ?? "-";
  return (
    <div className="flex justify-between text-slate-200">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{display}</span>
    </div>
  );
}

function formatRate(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

function buildPlaybookFilters(list: string[]): Array<{ value: string; label: string }> {
  const generic = "generic-swing-v0.1";
  const deduped = Array.from(new Set(list));
  const nonGeneric = deduped.filter((p) => p !== generic).sort();
  const hasGeneric = deduped.includes(generic);
  const chips: Array<{ value: string; label: string }> = [{ value: "", label: "Alle Playbooks" }];
  nonGeneric.forEach((p) => chips.push({ value: p, label: p }));
  if (hasGeneric) chips.push({ value: generic, label: `${generic} (legacy)` });
  return chips;
}

function aggregateTotals(buckets: ReturnType<typeof filterBuckets> extends Array<infer U> ? U[] : never) {
  const totals = {
    outcomesTotal: 0,
    closedCount: 0,
    openCount: 0,
    tpCount: 0,
    slCount: 0,
    expiredCount: 0,
    ambiguousCount: 0,
    invalidCount: 0,
  };
  for (const b of buckets) {
    totals.outcomesTotal += b.outcomesTotal;
    totals.closedCount += b.closedCount;
    totals.openCount += b.openCount;
    totals.tpCount += b.tpCount;
    totals.slCount += b.slCount;
    totals.expiredCount += b.expiredCount;
    totals.ambiguousCount += b.ambiguousCount;
    totals.invalidCount += b.invalidCount;
  }
  const winrateTpSl = totals.tpCount + totals.slCount > 0 ? totals.tpCount / (totals.tpCount + totals.slCount) : null;
  const closeRate = totals.outcomesTotal > 0 ? totals.closedCount / totals.outcomesTotal : null;
  return { ...totals, winrateTpSl, closeRate };
}
