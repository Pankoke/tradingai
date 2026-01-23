import Link from "next/link";
import path from "node:path";
import { readFile } from "node:fs/promises";
import type { Locale } from "@/i18n";
import { z } from "zod";

const allowedDays = ["30", "60", "180"];

const OutcomeStatusCountsSchema = z.object({
  outcomesTotal: z.number(),
  closedCount: z.number(),
  openCount: z.number(),
  tpCount: z.number(),
  slCount: z.number(),
  expiredCount: z.number(),
  ambiguousCount: z.number(),
  invalidCount: z.number(),
  unknownCount: z.number().optional().default(0),
  winrateDefinition: z.string().optional(),
  closeRate: z.number().nullable().optional(),
});

const ByKeySchema = z.object({
  key: z.object({
    assetId: z.string(),
    timeframe: z.string(),
    label: z.string(),
    playbookId: z.string().optional().default("unknown"),
    decision: z.string().optional().default("unknown"),
    grade: z.string().optional().default("UNKNOWN"),
  }),
  outcomesTotal: z.number(),
  closedCount: z.number(),
  openCount: z.number(),
  tpCount: z.number(),
  slCount: z.number(),
  expiredCount: z.number(),
  ambiguousCount: z.number(),
  invalidCount: z.number(),
  unknownCount: z.number().optional().default(0),
});

const ReportSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  params: z.object({
    days: z.number(),
    timeframes: z.array(z.string()),
    labels: z.array(z.string()),
  }),
  overall: OutcomeStatusCountsSchema,
  byKey: z.array(ByKeySchema),
});

type AggregatedRow = {
  playbookId: string;
  outcomesTotal: number;
  closedCount: number;
  openCount: number;
  tpCount: number;
  slCount: number;
  winrate: number | null;
  closeRate: number | null;
  flags: string[];
};

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ timeframe?: string; label?: string; minClosed?: string; days?: string; includeOpenOnly?: string }>;
};

export default async function PlaybooksOverviewPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const query = (await searchParams) ?? {};
  const timeframeFilter = (query.timeframe ?? "all").toLowerCase();
  const labelFilter = (query.label ?? "all").toLowerCase();
  const minClosed = Number.isFinite(Number(query.minClosed)) ? Number(query.minClosed) : 20;
  const includeOpenOnly = query.includeOpenOnly === "1";
  const days = allowedDays.includes(query.days ?? "") ? query.days! : "60";

  const report = await loadLatestReport();
  if (!report) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-white">Playbooks Overview (Swing)</h1>
        <p className="text-slate-300 text-sm">
          Kein Phase-1 Outcome-Artefakt gefunden. Bitte ausführen: <code>npm run phase1:analyze:swing -- --days=60</code>
        </p>
      </div>
    );
  }

  const rows = aggregatePlaybooks(report, {
    timeframe: timeframeFilter,
    label: labelFilter,
    minClosed,
    includeOpenOnly,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Playbooks Overview (Swing)</h1>
        <p className="text-sm text-slate-300">
          Artefakt: swing-outcome-analysis-latest (version {report.version}), generatedAt {report.generatedAt}, window {report.params.days} Tage.
        </p>
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

async function loadLatestReport() {
  const base = path.join(process.cwd(), "artifacts", "phase1");
  const candidates = [
    path.join(base, "swing-outcome-analysis-latest-v2.json"),
    path.join(base, "swing-outcome-analysis-latest-v1.json"),
  ];
  for (const file of candidates) {
    try {
      const raw = await readFile(file, "utf-8");
      const parsed = ReportSchema.parse(JSON.parse(raw));
      return parsed;
    } catch (err) {
      // continue to next candidate
    }
  }
  return null;
}

function aggregatePlaybooks(
  report: z.infer<typeof ReportSchema>,
  filters: { timeframe: string; label: string; minClosed: number; includeOpenOnly: boolean },
): AggregatedRow[] {
  const rows = report.byKey.filter((row) => {
    if (filters.timeframe !== "all" && row.key.timeframe.toLowerCase() !== filters.timeframe) return false;
    if (filters.label !== "all" && row.key.label.toLowerCase() !== filters.label) return false;
    return true;
  });
  const map = new Map<string, AggregatedRow>();
  for (const row of rows) {
    const id = row.key.playbookId || "unknown";
    const current = map.get(id) ?? {
      playbookId: id,
      outcomesTotal: 0,
      closedCount: 0,
      openCount: 0,
      tpCount: 0,
      slCount: 0,
      winrate: null as number | null,
      closeRate: null as number | null,
      flags: [] as string[],
    };
    current.outcomesTotal += row.outcomesTotal;
    current.closedCount += row.closedCount;
    current.openCount += row.openCount;
    current.tpCount += row.tpCount;
    current.slCount += row.slCount;
    map.set(id, current);
  }

  const result: AggregatedRow[] = [];
  for (const [, value] of map) {
    const denom = value.tpCount + value.slCount;
    value.winrate = denom > 0 ? value.tpCount / denom : null;
    value.closeRate = value.outcomesTotal > 0 ? value.closedCount / value.outcomesTotal : null;
    if (!filters.includeOpenOnly && value.closedCount < filters.minClosed) {
      value.flags.push("low-sample");
    }
    if (value.closeRate !== null && value.closeRate < 0.2) {
      value.flags.push("mostly-open");
    }
    if (filters.includeOpenOnly || value.closedCount >= filters.minClosed || value.flags.includes("mostly-open")) {
      result.push(value);
    }
  }

  return result.sort((a, b) => b.closedCount - a.closedCount || b.outcomesTotal - a.outcomesTotal);
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
