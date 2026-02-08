import type { Locale } from "@/i18n";
import type { ArtifactMeta } from "@/lib/artifacts/storage";
import { ArtifactHealthNotice } from "@/src/components/admin/ArtifactHealthNotice";
import {
  loadLatestOutcomeReport,
  loadLatestJoinStats,
  computeMissingDims,
  computeStalenessMinutes,
  computeMostlyOpenShare,
} from "./lib";
import { OutcomesIntro } from "@/src/components/admin/OutcomesIntro";
import { OutcomesHeader } from "@/src/components/admin/outcomes/OutcomesHeader";
import { buildOutcomesRelatedLinks } from "@/src/components/admin/outcomes/relatedLinks";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OutcomesDiagnosticsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const locale = (resolvedParams.locale as Locale | undefined) ?? "en";
  const messages = locale === "de" ? deMessages : enMessages;
  const related = buildOutcomesRelatedLinks(locale, {
    explorer: messages["admin.outcomes.related.explorer"],
    overview: messages["admin.outcomes.related.overview"],
    diagnostics: messages["admin.outcomes.related.diagnostics"],
    engineHealth: messages["admin.outcomes.related.engineHealth"],
    swingPerformance: messages["admin.outcomes.related.swingPerformance"],
  });
  const outcome = await loadLatestOutcomeReport();
  const join = await loadLatestJoinStats();

  if (!outcome || !join) {
    return (
      <div className="space-y-4">
        <OutcomesHeader
          title={messages["admin.outcomes.header.diagnostics.title"]}
          description={messages["admin.outcomes.header.diagnostics.description"]}
          notice={messages["admin.outcomes.header.diagnostics.notice"]}
          variant="artifact"
          related={related}
          currentKey="diagnostics"
        />
        <p className="text-slate-300 text-sm">Artefakte nicht gefunden. Bitte generieren:</p>
        <ul className="list-disc pl-5 text-sm text-slate-200">
          <li>
            Outcome-Analyse: <code>npm run phase1:analyze:swing -- --days=60</code>
          </li>
          <li>
            Join-Stats: <code>npm run phase1:join-stats -- --days=60</code>
          </li>
        </ul>
      </div>
    );
  }

  const miss = computeMissingDims(outcome.report);
  const stalenessOutcome = computeStalenessMinutes(outcome.report.generatedAt);
  const stalenessJoin = computeStalenessMinutes(join.join.generatedAt);
  const openShare = computeMostlyOpenShare(outcome.report);

  return (
    <div className="space-y-6">
      <OutcomesHeader
        title={messages["admin.outcomes.header.diagnostics.title"]}
        description={messages["admin.outcomes.header.diagnostics.description"]}
        notice={messages["admin.outcomes.header.diagnostics.notice"]}
        variant="artifact"
        related={related}
        currentKey="diagnostics"
      />
      <OutcomesIntro
        title="Worum geht es hier?"
        sections={[
          {
            heading: "Was zeigt diese Seite?",
            items: [
              "Artefakt-first Diagnostics: Outcome-Analyse + Join-Stats (Phase-1).",
              "Health-KPIs: joinRate, missing dimensions, mostly-open Anteil, Staleness.",
              "Runbook für Analyzer/Join-Stats/Backfill/Cron-Aufrufe.",
            ],
          },
          {
            heading: "Wichtige Eigenschaften",
            items: [
              "Liest statische Artefakte aus artifacts/phase1; kann stale sein.",
              "Keine DB-Live-Queries; Filter sind im Artefakt fix kodiert (z. B. days=60).",
              "Nicht für Einzel-Outcome-Drilldowns (dafür Explorer), nicht für Performance-KPIs (dafür Overview/Playbooks).",
            ],
          },
          {
            heading: "Wann nutzen?",
            items: [
              "Pipeline-Gesundheit prüfen (Join-Rate, Missing Playbook/Decision/Grade).",
              "Abweichungen erklären (z. B. nur wenige Playbooks sichtbar).",
              "Runbook-Kommandos schnell kopieren.",
            ],
          },
        ]}
      />
      <ArtifactHealthNotice source={outcome.meta.source} generatedAt={outcome.report.generatedAt} windowDays={outcome.report.params?.days} />
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200 space-y-2">
        <h2 className="text-sm font-semibold text-white">Warum weichen Zahlen ab?</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Diagnostics/Overview nutzen Artefakte (1D/1W, evtl. anderes Label-Fenster) und keine DB-Live-Queries.</li>
          <li>Explorer ist DB-driven (Swing 1D, Limit 300, Anzeige-Toggles) und kann andere Samples zeigen.</li>
          <li>Viele offene Outcomes → winrate n/a, closeRate niedrig; minClosed kann Playbooks ausblenden.</li>
        </ul>
      </section>
      <div className="space-y-2">
        <MetaBox label="Outcome Artefakt" meta={outcome.meta} />
        <MetaBox label="Join-Stats Artefakt" meta={join.meta} />
        <p className="text-sm text-slate-300">
          Artefakt-first: liest statische JSONs aus <code>artifacts/phase1/</code>. Daten können stale sein. Für frische
          Daten: Analyzer + Join-Stats erneut laufen lassen.
        </p>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold text-white">Data Flow (Phase-1)</h2>
        <ol className="list-decimal pl-5 text-sm text-slate-200 space-y-1">
          <li>Snapshots/Setups werden gebaut und in perception_snapshots.setups gespeichert.</li>
          <li>Outcomes werden evaluiert/backfilled und in setup_outcomes gespeichert.</li>
          <li>join-stats misst Join-Rate (setup_outcomes ↔ snapshot_items).</li>
          <li>swing-outcome-analysis aggregiert Outcomes (per asset/timeframe/label/playbook) und schreibt ein Artefakt.</li>
          <li>Admin-Seiten (Overview/Playbooks/Diagnostics) lesen die Artefakte read-only.</li>
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard
          title="Join"
          lines={[
            `joinRate: ${formatPct(join.join.overall.joinRate)}`,
            `matched: ${join.join.overall.matched ?? 0}`,
            `unmatched: ${join.join.overall.unmatched ?? 0}`,
            `stale: ${stalenessJoin === null ? "n/a" : `${stalenessJoin} min`}`,
            `source: ${join.meta.source} | key: ${join.meta.artifactId}`,
          ]}
        />
        <KpiCard
          title="Outcome Totals"
          lines={[
            `outcomes: ${outcome.report.overall.outcomesTotal}`,
            `closed: ${outcome.report.overall.closedCount}`,
            `open: ${outcome.report.overall.openCount}`,
            `tp: ${outcome.report.overall.tpCount} / sl: ${outcome.report.overall.slCount}`,
            `winrate tp/(tp+sl): ${formatPct(winrate(outcome.report.overall.tpCount, outcome.report.overall.slCount))}`,
            `closeRate: ${formatPct(outcome.report.overall.closeRate ?? null)}`,
            `mostlyOpenShare: ${formatPct(openShare)}`,
            `stale: ${stalenessOutcome === null ? "n/a" : `${stalenessOutcome} min`}`,
            `source: ${outcome.meta.source} | key: ${outcome.meta.artifactId}`,
          ]}
        />
        <KpiCard
          title="Integrity"
          lines={[
            `fallbackUsedCount: ${miss.fallbackUsed ?? 0}`,
            `missing playbookId: ${miss.missingPlaybook}`,
            `missing decision: ${miss.missingDecision}`,
            `missing grade: ${miss.missingGrade}`,
          ]}
        />
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold text-white">Warum sehe ich evtl. nur wenige Playbooks?</h2>
        <ul className="list-disc pl-5 text-sm text-slate-200 space-y-1">
          <li>MinClosed-Filter in Playbooks-Seite blendet Playbooks mit wenigen Closed aus (default 20).</li>
          <li>Viele Outcomes sind noch open → winrate n/a, CloseRate niedrig.</li>
          <li>Filter timeframe/label können die Daten stark reduzieren (Artefakt-Fenster = {outcome.report.params.days} Tage).</li>
          <li>Artefakt enthält nur tatsächlich evaluierte Outcomes im Fenster.</li>
        </ul>
        <div className="text-xs text-slate-400">
          Tipp: In /admin/playbooks minClosed auf 0 setzen und includeOpenOnly=1, falls du alle Playbooks sehen willst. Danach
          Analyzer/Join-Stats neu laufen lassen.
        </div>
      </section>

      {join.join.breakdowns.length > 0 && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-white">Join Breakdown</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
              <thead className="bg-slate-900/60">
                <tr>
                  {["Asset", "TF", "Label", "Setups", "Outcomes", "Matched", "Unmatched", "joinRate"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {join.join.breakdowns.map((row) => (
                  <tr key={`${row.assetId}-${row.timeframe}-${row.label}`} className="hover:bg-slate-900/50">
                    <td className="px-3 py-2 font-semibold text-slate-100">{row.assetId}</td>
                    <td className="px-3 py-2">{row.timeframe}</td>
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2">{row.setups ?? 0}</td>
                    <td className="px-3 py-2">{row.outcomes ?? 0}</td>
                    <td className="px-3 py-2">{row.matched ?? 0}</td>
                    <td className="px-3 py-2">{row.unmatched ?? 0}</td>
                    <td className="px-3 py-2">{formatPct(row.joinRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-white">Runbook (Copy/Paste)</h2>
        <RunbookBlock
          title="1) Outcome-Analyse"
          command="npm run phase1:analyze:swing -- --days=60"
          when="Wenn du neue Outcomes aggregieren willst."
          effect="Schreibt swing-outcome-analysis-latest-v*.json"
        />
        <RunbookBlock
          title="2) Join-Stats"
          command="npm run phase1:join-stats -- --days=60"
          when="Wenn du Join-Rate und Missing-Setups prüfen willst."
          effect="Schreibt join-stats-latest-v1.json"
        />
        <RunbookBlock
          title="3) Outcomes backfill (curl Beispiel)"
          command={`curl -X POST "$BASE_URL/api/cron/outcomes/backfill?daysBack=180&limitSetups=500&assetId=gold" -H "Authorization: Bearer $CRON_SECRET"`}
          when="Wenn Outcomes fehlen oder stale sind."
          effect="Füllt setup_outcomes neu/zusätzlich."
        />
        <RunbookBlock
          title="4) Outcomes evaluate (curl Beispiel)"
          command={`curl -X POST "$BASE_URL/api/cron/outcomes/evaluate?daysBack=180&limitSetups=500&assetId=gold" -H "Authorization: Bearer $CRON_SECRET"`}
          when="Wenn du Evaluation anstoßen willst."
          effect="Berechnet Outcome-Status neu."
        />
        <RunbookBlock
          title="5) Snapshots backfill swing (curl Beispiel)"
          command={`curl -X POST "$BASE_URL/api/cron/snapshots/backfillSwing?days=60&force=1&recentFirst=1" -H "Authorization: Bearer $CRON_SECRET"`}
          when="Wenn Setups/Snapshots fehlen."
          effect="Erzeugt/aktualisiert perception_snapshots.setups"
        />
        <RunbookBlock
          title="6) Recompute decisions (curl Beispiel)"
          command={`curl -X POST "$BASE_URL/api/admin/maintenance/recompute-decisions?assetId=gold&timeframe=1D&days=60&label=eod" -H "Authorization: Bearer $CRON_SECRET"`}
          when="Wenn persisted decisions/grades fehlen."
          effect="Aktualisiert decisions in Snapshots (persisted fields)."
        />
      </section>

    </div>
  );
}

function KpiCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm text-slate-200">
        {lines.map((line) => (
          <li key={line} className="flex justify-between gap-2">
            <span className="text-slate-300">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RunbookBlock({ title, command, when, effect }: { title: string; command: string; when: string; effect: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200 space-y-1">
      <div className="font-semibold text-white">{title}</div>
      <div className="text-xs text-slate-400">{when}</div>
      <code className="block rounded bg-slate-950/80 p-2 text-[11px] text-emerald-300">{command}</code>
      <div className="text-xs text-slate-400">Ergebnis: {effect}</div>
    </div>
  );
}

function MetaBox({ label, meta }: { label: string; meta: ArtifactMeta }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300 space-y-1">
      <div className="font-semibold text-white">{label}</div>
      <div className="flex flex-wrap gap-3">
        <span>source: {meta.source}</span>
        <span>artifact: {meta.artifactId}</span>
        <span>
          version: {meta.pickedVersion ?? "n/a"}
          {meta.fallbackReason ? ` (fallback: ${meta.fallbackReason})` : ""}
        </span>
        {meta.byteSize ? <span>size: {meta.byteSize} bytes</span> : null}
        <span>loadedAt: {meta.loadedAt}</span>
        {meta.generatedAt ? <span>generatedAt: {meta.generatedAt}</span> : null}
      </div>
    </div>
  );
}

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function winrate(tp: number, sl: number): number | null {
  const denom = tp + sl;
  return denom > 0 ? tp / denom : null;
}

