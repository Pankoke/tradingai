import Link from "next/link";
import type { Locale } from "@/i18n";
import { OutcomesIntro } from "@/src/components/admin/OutcomesIntro";
import { ArtifactHealthNotice } from "@/src/components/admin/ArtifactHealthNotice";
import type { ArtifactMeta } from "@/lib/artifacts/storage";
import { SWING_PLAYBOOK_IDS } from "@/src/lib/engine/playbooks";
import { loadLatestOutcomeReport } from "../../playbooks/lib";
import {
  buildExplorerHrefFromOverviewState,
  buildOverviewHref,
  mergeOverviewParams,
  parseOverviewParams,
  type OverviewQuery,
} from "../queryModel";
import {
  aggregateAssets,
  aggregateDecisions,
  aggregatePlaybooks,
  computeIntegrity,
  computeTotals,
  diffPlaybooks,
  filterRows,
  type BucketRow,
  type Integrity,
  type Totals,
} from "./lib";
import { OutcomesHeader } from "@/src/components/admin/outcomes/OutcomesHeader";
import { buildOutcomesRelatedLinks } from "@/src/components/admin/outcomes/relatedLinks";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    timeframe?: string;
    label?: string;
    minClosed?: string;
    includeOpenOnly?: string;
    flag?: string;
  }>;
};

export default async function OutcomesOverviewPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const locale = (resolvedParams.locale as Locale | undefined) ?? "en";
  const messages = locale === "de" ? deMessages : enMessages;
  const query = (await searchParams) ?? {};
  const overviewFilters = parseOverviewParams(query);
  const { timeframe, label, minClosed, includeOpenOnly, flag: flagFilter } = overviewFilters;
  const related = buildOutcomesRelatedLinks(locale, {
    explorer: messages["admin.outcomes.related.explorer"],
    overview: messages["admin.outcomes.related.overview"],
    diagnostics: messages["admin.outcomes.related.diagnostics"],
    engineHealth: messages["admin.outcomes.related.engineHealth"],
    swingPerformance: messages["admin.outcomes.related.swingPerformance"],
  });

  const loaded = await loadLatestOutcomeReport();
  if (!loaded) {
    return (
      <div className="space-y-3">
        <OutcomesHeader
          title={messages["admin.outcomes.header.overview.title"]}
          description={messages["admin.outcomes.header.overview.description"]}
          notice={messages["admin.outcomes.header.overview.notice"]}
          variant="artifact"
          related={related}
          currentKey="overview"
        />
        <p className="text-slate-300 text-sm">
          Kein Phase-1 Outcome-Artefakt gefunden. Bitte ausführen: <code>npm run phase1:analyze:swing -- --days=60</code>
        </p>
      </div>
    );
  }

  const { report, meta } = loaded;
  const reportDays = report.params?.days ?? 30;
  const overviewWithDays = mergeOverviewParams(overviewFilters, { days: overviewFilters.days ?? reportDays });
  const filtered = filterRows(report, { timeframe, label, minClosed, includeOpenOnly });
  const totals = computeTotals(filtered);
  const playbooksRaw = aggregatePlaybooks(filtered, { timeframe, label, minClosed, includeOpenOnly });
  const assetsRaw = aggregateAssets(filtered, { timeframe, label, minClosed, includeOpenOnly });
  const playbooks = filterByFlag(playbooksRaw, flagFilter).slice(0, 10);
  const assets = filterByFlag(assetsRaw, flagFilter).slice(0, 10);
  const decisions = aggregateDecisions(filtered);
  const integrity = computeIntegrity(
    filtered,
    (report as unknown as { fallbackUsedCount?: number }).fallbackUsedCount ?? null,
  );
  const observedPlaybooks = Array.from(new Set(report.byKey.map((r) => r.key.playbookId).filter(Boolean))) as string[];
  const coverage = diffPlaybooks(SWING_PLAYBOOK_IDS, observedPlaybooks);
  const expectedMissing = coverage.missing.filter(
    (id) => id === "index-swing-v0.1" || id === "fx-swing-v0.1" || id === "generic-swing-v0.1",
  );
  const expectedMissingSet = new Set<string>(expectedMissing);
  const problemMissing = coverage.missing.filter((id) => !expectedMissingSet.has(id));

  return (
    <div className="space-y-6">
      <OutcomesHeader
        title={messages["admin.outcomes.header.overview.title"]}
        description={messages["admin.outcomes.header.overview.description"]}
        notice={messages["admin.outcomes.header.overview.notice"]}
        variant="artifact"
        related={related}
        currentKey="overview"
      />
      <OutcomesIntro
        title="Worum geht es hier?"
        sections={[
          {
            heading: "Was zeigt diese Seite?",
            items: [
              "Artefakt-first Aggregation (swing-outcome-analysis) für Swing 1D/1W, ohne DB-Load.",
              "KPIs pro Playbook/Asset/Decision mit minClosed-Filter.",
              "Staleness möglich – basiert auf zuletzt erzeugtem Artefakt.",
            ],
          },
          {
            heading: "Wichtige Eigenschaften",
            items: [
              "Winrate = TP/(TP+SL); CloseRate = Closed/Outcomes.",
              "minClosed blendet kleine Samples aus; includeOpenOnly für offene Playbooks.",
              "Kann von Explorer/Diagnostics abweichen (anderes Fenster/Labels, kein Limit).",
            ],
          },
          {
            heading: "Wann nutzen?",
            items: [
              "Schneller Überblick über Performance je Playbook/Asset.",
              "Vergleich von geschlossenen vs. offenen Outcomes.",
              "Nicht für detaillierte Single-Outcome-Inspektion (dafür Explorer).",
            ],
          },
        ]}
      />
      <ArtifactHealthNotice source={meta.source} generatedAt={report.generatedAt} windowDays={report.params?.days} />
      <InterpretationBox
        totals={totals}
        integrity={integrity}
        monitoringMode={totals.closed < 20}
      />
      <div className="space-y-2">
        <MetaBox meta={meta} report={report} />
        <div className="text-xs text-slate-400">
          Filters: tf={overviewWithDays.timeframe}, label={overviewWithDays.label}, minClosed={overviewWithDays.minClosed},
          includeOpenOnly={overviewWithDays.includeOpenOnly ? "1" : "0"}, flag={overviewWithDays.flag}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["all", "1d", "1w"].map((tf) => (
            <Link
              key={tf}
              href={buildOverviewHref(locale, "/admin/outcomes/overview", mergeOverviewParams(overviewWithDays, { timeframe: tf as "all" | "1d" | "1w" }))}
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
              href={buildOverviewHref(locale, "/admin/outcomes/overview", mergeOverviewParams(overviewWithDays, { label: lb as OverviewQuery["label"] }))}
              className={`rounded-full px-3 py-1 font-semibold ${
                lb === label ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              Label {lb}
            </Link>
          ))}
          <Link
            href={buildOverviewHref(
              locale,
              "/admin/outcomes/overview",
              mergeOverviewParams(overviewWithDays, { includeOpenOnly: !includeOpenOnly }),
            )}
            className="rounded bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
          >
            {includeOpenOnly ? "Playbooks mit nur Closed zeigen" : "Playbooks mit Open-only anzeigen"}
          </Link>
          {["all", "low-sample", "mostly-open"].map((flag) => (
            <Link
              key={flag}
              href={buildOverviewHref(
                locale,
                "/admin/outcomes/overview",
                mergeOverviewParams(overviewWithDays, { flag: flag as OverviewQuery["flag"] }),
              )}
              className={`rounded-full px-3 py-1 font-semibold ${
                flag === flagFilter ? "bg-amber-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              Flag {flag}
            </Link>
          ))}
        </div>
      </div>

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
        <BucketTable
          title="Top Playbooks"
          rows={playbooks}
          linkBase={buildExplorerHrefFromOverviewState(locale, overviewWithDays, { reportDays })}
        />
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
        <div className="text-xs text-slate-400">
          Flag-Legende: <span className="text-slate-200">low-sample</span> = wenig Closed;{" "}
          <span className="text-slate-200">mostly-open</span> = CloseRate &lt; 20%.
        </div>
        <div className="text-xs text-slate-400">
          Flag-Filter wirkt nur auf die Tabellen (Top Playbooks/Assets), nicht auf die KPI-Boxen.
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold text-white">Playbook Coverage (Artefakt vs Registry)</h2>
        <p className="text-xs text-slate-300">
          Registry Swing-Playbooks vs. beobachtet im Artefakt. generic ist Fallback; Index-/FX-Klassen können fehlen,
          wenn Asset-spezifische Resolver greifen. Erwartet-missing (ok): index-swing-v0.1, fx-swing-v0.1, generic-swing-v0.1.
        </p>
        <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-200">
          <CoverageList title="Observed" items={coverage.observed} tone="ok" />
          <CoverageList
            title="Missing (Registry aber nicht im Artefakt)"
            items={[...problemMissing, ...expectedMissing]}
            tone="warn"
          />
          <CoverageList title="Unexpected (Artefakt aber nicht Registry)" items={coverage.unexpected} tone="error" />
        </div>
      </section>
    </div>
  );
}

function BucketTable({ title, rows, linkBase }: { title: string; rows: BucketRow[]; linkBase?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
          <thead className="bg-slate-900/60">
            <tr>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">Key</th>
              <th colSpan={5} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                Counts
              </th>
              <th colSpan={2} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                Quality
              </th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">Meta</th>
            </tr>
            <tr>
              {["Outcomes", "Closed", "Open", "TP", "SL", "Winrate", "CloseRate", "Flags"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-900/50">
                <td className="px-3 py-2 font-semibold text-slate-100">
                  {linkBase ? (
                    <Link
                      href={`${linkBase}&playbookId=${encodeURIComponent(row.id)}`}
                      className="text-emerald-300 hover:underline"
                    >
                      {row.id}
                    </Link>
                  ) : (
                    row.id
                  )}
                </td>
                <td className="px-3 py-2">{row.outcomesTotal}</td>
                <td className="px-3 py-2">{row.closed}</td>
                <td className="px-3 py-2">{row.open}</td>
                <td className="px-3 py-2">{row.tp}</td>
                <td className="px-3 py-2">{row.sl}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200" title={`Closed: ${row.closed}`}>
                    {formatRate(row.tp, row.sl)}
                  </span>
                </td>
                <td className="px-3 py-2">{formatRateFromValue(row.closeRate)}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{row.flags.join(" | ") || "-"}</td>
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

function CoverageList({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "warn" | "error" }) {
  const toneClass = tone === "ok" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-rose-300";
  return (
    <div className="rounded border border-slate-800 bg-slate-950/50 p-3 space-y-1">
      <div className={`font-semibold ${toneClass}`}>{title}</div>
      {items.length === 0 ? <div className="text-slate-500">-</div> : null}
      {items.length > 0 ? (
        <ul className="list-disc pl-4 space-y-1">
          {items.map((item) => (
            <li key={item} className="text-slate-200">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
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

function filterByFlag(rows: BucketRow[], flag: string): BucketRow[] {
  if (flag === "all") return rows;
  return rows.filter((row) => row.flags.includes(flag));
}

function InterpretationBox({
  totals,
  integrity,
  monitoringMode,
}: {
  totals: Totals;
  integrity: Integrity;
  monitoringMode: boolean;
}) {
  const hints: string[] = [];
  if (monitoringMode) {
    hints.push("Monitoring Mode: Closed < 20. Ergebnisse sind nur als Trendhinweis interpretierbar.");
  }
  if (totals.open > totals.closed) {
    hints.push("Viele offene Outcomes -> Winrate n/a oder instabil; CloseRate prüfen.");
  }
  if (integrity.missingPlaybook > 0 || integrity.missingDecision > 0 || integrity.missingGrade > 0) {
    hints.push("Dimensionen fehlen (playbook/decision/grade) -> Datenqualität prüfen.");
  }
  if (hints.length === 0) {
    hints.push("Closed-Samples ausreichend und keine offensichtlichen Warnungen.");
  }
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200 space-y-2">
      <div className="font-semibold text-white">Interpretation</div>
      <ul className="list-disc pl-5 space-y-1">
        {hints.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ul>
    </div>
  );
}

