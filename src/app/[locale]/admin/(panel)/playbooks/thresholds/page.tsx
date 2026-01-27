import Link from "next/link";
import type { Locale } from "@/i18n";
import { loadGoldThresholdRecommendations } from "@/src/server/admin/playbookThresholdService";
import { loadThresholdRelaxationSimulation } from "@/src/server/admin/playbookThresholdSimulation";
import {
  buildMatrix,
  formatPercent,
  pickRecommendation,
  type RecommendationGuardrails,
  type SimulationGridRow,
  utilityClass,
} from "@/src/lib/admin/thresholdSimulate";
import { InfoTooltip } from "@/src/components/admin/InfoTooltip";
import { IntroCallout } from "@/src/components/admin/IntroCallout";
import { helpText } from "@/src/components/admin/thresholdsHelpText";
import { ThresholdControls } from "@/src/components/admin/ThresholdControls";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

const ALLOWED_DAYS = ["30", "60", "90", "180", "365", "730"];

export default async function ThresholdsPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const query = (await searchParams) ?? {};
  const playbookId = query.playbookId ?? "gold-swing-v0.2";
  const days = ALLOWED_DAYS.includes(query.days ?? "") ? Number(query.days) : 90;
  const includeOpen = query.includeOpen === "1";
  const includeNoTrade = query.includeNoTrade === "1";
  const closedOnly = query.closedOnly !== "0";
  const limit = query.limit ? Number.parseInt(query.limit, 10) : undefined;
  const useConf = query.useConf === "1";
  const sqCandidates = sortNumbers(parseCsvNumbers(query.sq));
  const confCandidates = sortNumbers(parseCsvNumbers(query.conf));
  const minClosedTotal = Number.isFinite(Number(query.minClosedTotal)) ? Number(query.minClosedTotal) : 20;
  const minHits = Number.isFinite(Number(query.minHits)) ? Number(query.minHits) : 1;
  const guardrails: RecommendationGuardrails = { minClosedTotal, minHits };

  const rec = await loadGoldThresholdRecommendations({ days, includeOpen });
  const simulation = await getSimulationMemoized({
    days,
    playbookId,
    biasCandidates: [rec.current.biasMin ?? 80],
    sqCandidates,
    confCandidates,
    includeNoTrade,
    closedOnly,
    limit,
    useConf,
  });
  if (simulation.meta.timings) {
    console.info(
      "[thresholds/page]",
      JSON.stringify({
        playbookId,
        days,
        closedOnly,
        includeNoTrade,
        useConf,
        limit,
        totalMs: simulation.meta.timings.totalMs,
      }),
    );
  }

  const { population } = simulation.meta;
  const hasConf = simulation.grid.some((r) => typeof r.confMin === "number");
  const recommendation = pickRecommendation(simulation.grid, guardrails);
  const matrix = hasConf ? buildMatrix(simulation.grid) : null;
  const timings = simulation.meta.timings;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Playbook Thresholds (Gold Swing)</h1>
        <p className="text-sm text-slate-300">
          Read-only Vorschlaege aus Outcomes & Snapshots (letzte {days} Tage). Aktive Playbook-Logik bleibt unveraendert.
        </p>
        <IntroCallout />
        <div className="flex flex-wrap gap-2 text-xs">
          {ALLOWED_DAYS.map((value) => (
            <Link
              key={value}
              href={`/${locale}/admin/playbooks/thresholds?days=${value}${includeOpen ? "&includeOpen=1" : ""}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                Number(value) === days ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {value} Tage
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          <ThresholdControls
            closedOnly={closedOnly}
            includeNoTrade={includeNoTrade}
            useConf={useConf}
            limit={limit}
            minClosedTotal={minClosedTotal}
            minHits={minHits}
            lastRun={timings ? { durationMs: timings.totalMs } : undefined}
          />
        </div>
        <ExportLinks
          playbookId={playbookId}
          days={days}
          closedOnly={closedOnly}
          includeNoTrade={includeNoTrade}
          useConf={useConf}
          sqCandidates={sqCandidates}
          confCandidates={confCandidates}
          limit={limit}
          minClosedTotal={minClosedTotal}
          minHits={minHits}
        />
      </header>

      <Card title="Datenbasis (nach Filtern)">
        {population ? (
          <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-200">
            <div className="space-y-1 rounded bg-slate-900/60 p-3">
              <div className="text-xs text-slate-400">Abgeschlossene Faelle (closedOnly)</div>
              <div className="text-lg font-semibold">{population.afterClosedOnly}</div>
              <div className="text-xs text-slate-400">Qualifiziert: {population.tradeableCount}</div>
              <div className="text-xs text-slate-400">
                NO_TRADE: {population.noTradeCount} ({(population.noTradeRate * 100).toFixed(1)}%)
              </div>
            </div>
            <CountsList title="Grade Counts" entries={population.gradeCounts} />
            <CountsList title="Outcome Status" entries={population.outcomeStatusCounts} />
          </div>
        ) : (
          <div className="text-xs text-slate-400">Keine Population-Daten.</div>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Closed-only filtert auf abgeschlossene Outcomes. NO_TRADE stammt aus dem Grading (kein Trade erlaubt). Von{" "}
          {population?.afterClosedOnly ?? 0} betrachteten Faellen sind {population?.tradeableCount ?? 0} fuer das Grading
          qualifiziert.
          {population && population.noTradeRate > 0.6
            ? " Hinweis: hoher NO_TRADE-Anteil - Regeln ggf. sehr restriktiv."
            : ""}
        </p>
      </Card>

      <Card title="NO_TRADE Gruende">
        {includeNoTrade ? (
          population?.noTradeReasonCounts && Object.keys(population.noTradeReasonCounts).length ? (
            <div className="space-y-2 text-sm text-slate-200">
              <p className="text-xs text-slate-400">
                Zeigt, warum Faelle als NO_TRADE markiert wurden (Grading-Entscheidung).
              </p>
              <div className="space-y-2">
                {Object.entries(population.noTradeReasonCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => {
                    const pct =
                      population.noTradeCount > 0 ? ((count / population.noTradeCount) * 100).toFixed(1) : null;
                    const examples = population.noTradeReasonExamples?.[reason];
                    return (
                      <div key={reason} className="rounded bg-slate-900/60 px-3 py-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-100">{reason}</span>
                          <span className="text-slate-200">
                            {count}
                            {pct ? ` (${pct}%)` : ""}
                          </span>
                        </div>
                        {examples && examples.length ? (
                          <div className="text-[11px] text-slate-400">Beispiele: {examples.join(", ")}</div>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Keine NO_TRADE Daten vorhanden.</div>
          )
        ) : (
          <div className="text-xs text-slate-400">
            Aktiviere &quot;include NO_TRADE&quot;, um Gruende anzuzeigen.
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Outcome-Verteilung">
          <p className="text-xs text-slate-400 mb-2">
            Zeigt, wie haeufig TP/SL/Expired in den betrachteten Faellen vorkamen (historisch, keine Handelsfreigabe).
          </p>
          <div className="space-y-2 text-sm text-slate-200">
            {Object.entries(rec.byGrade).map(([grade, bucket]) => (
              <div key={grade} className="rounded bg-slate-900/60 px-3 py-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Grade {grade}</span>
                  <span>{bucket.winRate !== null ? `${Math.round(bucket.winRate * 100)}%` : "-"}</span>
                </div>
                <div className="text-xs text-slate-400">
                  TP {bucket.hit_tp} | SL {bucket.hit_sl} | Exp {bucket.expired} | Amb {bucket.ambiguous} | Open {bucket.open}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Sensitivitaet SQ-Min">
          <p className="text-xs text-slate-400 mb-2">
            Wie aendert sich die Trefferquote, wenn die Signal-Qualitaet angehoben wird? (Nur zur Orientierung.)
          </p>
          <div className="space-y-2 text-sm text-slate-200">
            {rec.sensitivity.map((p) => (
              <div key={p.sqMin} className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
                <span>SQ &gt;= {p.sqMin}</span>
                <span>
                  {p.winRate !== null ? `${Math.round(p.winRate * 100)}%` : "-"} (n={p.samples})
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Schwellen-Simulation (SQ / Confidence)">
        <div className="text-xs text-slate-300 mb-3 space-y-1">
          <div className="flex items-center gap-1">
            <span>So liest du das:</span>
            <InfoTooltip text="Jede Zeile/Zelle = Mindest-SQ (und ggf. Confidence). Qualifiziert = fuer Grading beruecksichtigte Faelle." />
          </div>
          <div>
            Hoehere Schwellen reduzieren qualifizierte Faelle; Trefferquote/Expiry aendert sich. Vergleichswert ist relativ, kein
            Trading-Signal.
          </div>
        </div>
        {hasConf && matrix ? <Heatmap matrix={matrix} /> : <SqTable rows={simulation.grid} />}
        <ExportLinks
          playbookId={playbookId}
          days={days}
          closedOnly={closedOnly}
          includeNoTrade={includeNoTrade}
          useConf={useConf}
          sqCandidates={sqCandidates}
          confCandidates={confCandidates}
          limit={limit}
          minClosedTotal={minClosedTotal}
          minHits={minHits}
        />
      </Card>

      <Card title="Empfohlene Schwelle (Vorschlag)">
        {recommendation.row ? (
          <div className="space-y-2 text-sm text-slate-200">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs">
                {recommendation.label === "Low confidence recommendation" ? "Unsicher" : "Solide Datenbasis"}
              </span>
              {recommendation.note ? <span className="text-xs text-slate-400">{recommendation.note}</span> : null}
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1">
                <span>Warum dieser Vorschlag?</span>
                <InfoTooltip text="Vergleichswert balanciert Trefferquote und Anzahl qualifizierter Faelle. Kein Trading-Signal." />
              </div>
              <ul className="list-disc space-y-1 pl-4">
                <li>Vergleichswert ist relativ und dient nur zur Kalibrierung des Gradings.</li>
                <li>Guardrails schuetzen vor Mini-Stichproben.</li>
              </ul>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Metric label="SQ Min" value={recommendation.row.sqMin ?? "-"} />
              {recommendation.row.confMin !== undefined ? (
                <Metric label="Conf Min" value={recommendation.row.confMin ?? "-"} />
              ) : null}
              <Metric label="Qualifiziert" value={recommendation.row.eligibleCount} />
            </div>
            <div className="grid gap-2 md:grid-cols-5">
              <Metric label="Closed" value={recommendation.row.kpis.closedTotal} />
              <Metric label="Trefferquote (TP)" value={formatPercent(recommendation.row.kpis.hitRate)} />
              <Metric label="Ausgelaufen (Expiry)" value={formatPercent(recommendation.row.kpis.expiryRate)} />
              <Metric label="TP/SL Verhaeltnis" value={recommendation.row.kpis.winLoss.toFixed(2)} />
              <Metric label="Vergleichswert" value={recommendation.row.kpis.utilityScore.toFixed(1)} />
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">Keine Empfehlung (zu wenige Daten).</div>
        )}
        <div className="mt-2 text-xs text-slate-400">
          Vergleichswert = Trefferquote*100 minus Auslaufen*20. Nur zum Vergleichen, keine Handelsfreigabe. Kleine Samples (&lt;
          {minClosedTotal}) gelten als unsicher.
        </div>
      </Card>

      {rec.insufficientData ? null : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Aktuelle Schwellen">
            <ThresholdList thresholds={rec.current} />
          </Card>
          <Card title="Empfohlene Schwellen">
            <ThresholdList thresholds={rec.recommended ?? rec.current} deltas={rec.deltas} />
          </Card>
        </div>
      )}

      {timings ? (
        <Card title="Server-Zeiten (Diagnose)">
          <div className="grid gap-2 text-xs text-slate-200 md:grid-cols-3">
            <Metric label="Total" value={`${Math.round(timings.totalMs)} ms`} />
            <Metric label="Fetch" value={`${Math.round(timings.fetchOutcomesMs)} ms`} />
            <Metric label="Normalize" value={`${Math.round(timings.normalizeMs)} ms`} />
            <Metric label="Grid" value={`${Math.round(timings.gridEvalMs)} ms`} />
            <Metric label="Recommendation" value={`${Math.round(timings.recommendationMs)} ms`} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function ThresholdList({ thresholds, deltas }: { thresholds: Record<string, number>; deltas?: Record<string, number> }) {
  return (
    <div className="space-y-2 text-sm text-slate-200">
      {Object.entries(thresholds).map(([key, value]) => (
        <div key={key} className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
          <span className="capitalize">{key}</span>
          <span className="font-semibold">
            {value}
            {deltas && typeof deltas[key] === "number" && deltas[key] !== 0 ? (
              <span className="text-xs text-slate-400"> ({deltas[key] > 0 ? "+" : ""}{deltas[key]})</span>
            ) : null}
          </span>
        </div>
      ))}
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

function buildExportUrl({
  format,
  playbookId,
  days,
  closedOnly,
  includeNoTrade,
  useConf,
  sqCandidates,
  confCandidates,
  limit,
  minClosedTotal,
  minHits,
}: {
  format: "json" | "csv";
  playbookId: string;
  days: number;
  closedOnly: boolean;
  includeNoTrade: boolean;
  useConf: boolean;
  sqCandidates?: number[];
  confCandidates?: number[];
  limit?: number;
  minClosedTotal?: number;
  minHits?: number;
}) {
  const params = new URLSearchParams();
  params.set("format", format);
  params.set("playbookId", playbookId);
  params.set("days", String(days));
  params.set("closedOnly", closedOnly ? "1" : "0");
  params.set("includeNoTrade", includeNoTrade ? "1" : "0");
  params.set("useConf", useConf ? "1" : "0");
  if (typeof limit === "number") params.set("limit", String(limit));
  if (sqCandidates && sqCandidates.length) params.set("sq", sqCandidates.join(","));
  if (confCandidates && confCandidates.length) params.set("conf", confCandidates.join(","));
  if (typeof minClosedTotal === "number") params.set("minClosedTotal", String(minClosedTotal));
  if (typeof minHits === "number") params.set("minHits", String(minHits));
  return `/api/admin/playbooks/thresholds/simulate/export?${params.toString()}`;
}

function ExportLinks(props: {
  playbookId: string;
  days: number;
  closedOnly: boolean;
  includeNoTrade: boolean;
  useConf: boolean;
  sqCandidates?: number[];
  confCandidates?: number[];
  limit?: number;
  minClosedTotal?: number;
  minHits?: number;
}) {
  const jsonUrl = buildExportUrl({ ...props, format: "json" });
  const csvUrl = buildExportUrl({ ...props, format: "csv" });
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <Link href={jsonUrl} className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700">
        Export JSON
      </Link>
      <Link href={csvUrl} className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700">
        Export CSV
      </Link>
      <span className="text-slate-400">
        MinClosed {props.minClosedTotal ?? "-"}, MinHits {props.minHits ?? "-"}
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded bg-slate-900/60 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function CountsList({ title, entries }: { title: string; entries: Record<string, number> }) {
  return (
    <div className="space-y-1 rounded bg-slate-900/60 p-3">
      <div className="text-xs font-semibold text-white">{title}</div>
      <ul className="text-xs text-slate-300 space-y-1">
        {Object.entries(entries).map(([k, v]) => (
          <li key={k} className="flex justify-between">
            <span>{k}</span>
            <span className="font-semibold">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function sortNumbers(values?: number[] | null): number[] | undefined {
  if (!values) return undefined;
  return [...values].sort((a, b) => a - b);
}

const simulationCache = new Map<string, Promise<Awaited<ReturnType<typeof loadThresholdRelaxationSimulation>>>>();

function buildSimKey(params: {
  playbookId: string;
  days: number;
  sqCandidates?: number[];
  confCandidates?: number[];
  includeNoTrade: boolean;
  closedOnly: boolean;
  limit?: number;
  useConf: boolean;
}) {
  return JSON.stringify({
    playbookId: params.playbookId,
    days: params.days,
    sq: params.sqCandidates,
    conf: params.confCandidates,
    includeNoTrade: params.includeNoTrade,
    closedOnly: params.closedOnly,
    limit: params.limit,
    useConf: params.useConf,
  });
}

async function getSimulationMemoized(params: Parameters<typeof loadThresholdRelaxationSimulation>[0]) {
  const key = buildSimKey({
    playbookId: params.playbookId ?? "gold-swing-v0.2",
    days: params.days ?? 730,
    sqCandidates: params.sqCandidates,
    confCandidates: params.confCandidates,
    includeNoTrade: params.includeNoTrade ?? false,
    closedOnly: params.closedOnly ?? true,
    limit: params.limit,
    useConf: params.useConf ?? false,
  });
  const hit = simulationCache.get(key);
  if (hit) return hit;
  const promise = loadThresholdRelaxationSimulation(params);
  simulationCache.set(key, promise);
  return promise;
}

function SqTable({ rows }: { rows: SimulationGridRow[] }) {
  const sorted = [...rows].sort((a, b) => (a.sqMin ?? 0) - (b.sqMin ?? 0));
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs text-slate-200">
        <thead>
          <tr className="bg-slate-900/60">
            <th className="px-2 py-1 text-left">SQMin</th>
            <th className="px-2 py-1 text-left">
              <div className="flex items-center gap-1">
                Qualifiziert <InfoTooltip text={helpText.eligible} />
              </div>
            </th>
            <th className="px-2 py-1 text-left">TP</th>
            <th className="px-2 py-1 text-left">SL</th>
            <th className="px-2 py-1 text-left">
              <div className="flex items-center gap-1">
                Exp <InfoTooltip text={helpText.expiry} />
              </div>
            </th>
            <th className="px-2 py-1 text-left">
              <div className="flex items-center gap-1">
                Trefferquote <InfoTooltip text={helpText.hitRate} />
              </div>
            </th>
            <th className="px-2 py-1 text-left">
              <div className="flex items-center gap-1">
                Score <InfoTooltip text={helpText.utility} />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={`${row.sqMin ?? "sq"}`} className="border-b border-slate-800">
              <td className="px-2 py-1">{row.sqMin ?? "-"}</td>
              <td className="px-2 py-1">{row.eligibleCount}</td>
              <td className="px-2 py-1">{row.closedCounts.hit_tp}</td>
              <td className="px-2 py-1">{row.closedCounts.hit_sl}</td>
              <td className="px-2 py-1">{row.closedCounts.expired}</td>
              <td className="px-2 py-1">{formatPercent(row.kpis.hitRate)}</td>
              <td className="px-2 py-1">{row.kpis.utilityScore.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Heatmap({
  matrix,
}: {
  matrix: { sqValues: number[]; confValues: number[]; cells: Record<string, SimulationGridRow> };
}) {
  return (
    <div className="overflow-x-auto text-xs text-slate-200">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">SQ \\ Conf</th>
            {matrix.confValues.map((c) => (
              <th key={c} className="px-2 py-1 text-center">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.sqValues.map((sq) => (
            <tr key={sq} className="border-b border-slate-800">
              <td className="px-2 py-1 font-semibold">{sq}</td>
              {matrix.confValues.map((conf) => {
                const row = matrix.cells[`${sq}|${conf}`];
                if (!row) return <td key={`${sq}-${conf}`} className="px-2 py-1 text-center">-</td>;
                const cls = utilityClass(row.kpis.utilityScore);
                return (
                  <td key={`${sq}-${conf}`} className="px-2 py-1">
                    <div className={`rounded px-2 py-1 text-center ${cls}`}>
                      <div className="font-semibold">{row.kpis.utilityScore.toFixed(1)}</div>
                      <div className="text-[10px] text-slate-100/80">n={row.kpis.closedTotal}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseCsvNumbers(value?: string): number[] | undefined {
  if (!value) return undefined;
  const parsed = value
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((v) => Number.isFinite(v));
  return parsed.length ? parsed : undefined;
}

















