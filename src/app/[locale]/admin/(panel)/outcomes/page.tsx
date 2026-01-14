import Link from "next/link";
import type { Locale } from "@/i18n";
import { loadOutcomeStats } from "@/src/server/admin/outcomeService";
import { InfoTooltip } from "@/src/components/admin/InfoTooltip";
import { OutcomesExportButtons } from "@/src/components/admin/OutcomesExportButtons";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ days?: string; assetId?: string; playbookId?: string; showNoTradeType?: string }>;
};

const ALLOWED_DAYS = ["7", "30", "90", "180", "365", "730"];

export default async function OutcomesPage({ params, searchParams }: PageProps) {
  const locale = (await params).locale as Locale;
  const query = (await searchParams) ?? {};
  const days = ALLOWED_DAYS.includes(query.days ?? "") ? Number(query.days) : 30;
  const assetId = query.assetId;
  const playbookId = query.playbookId;
  const showNoTradeType = query.showNoTradeType === "1";

  const stats = await loadOutcomeStats({ days, assetId, playbookId });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Outcomes</h1>
        <p className="text-sm text-slate-300">
          Read-only Outcome Tracking fǬr SWING / 1D. Fenster: letzte {days} Tage{assetId ? `, Asset: ${assetId}` : ""}.
        </p>
        <div className="rounded-md bg-slate-900/60 p-3 text-xs text-slate-200">
          KPIs beziehen sich auf handelbare Setups (Grade A/B). NO_TRADE ist eine bewusste Filter-Entscheidung und kein
          negatives Outcome. Win-Rate misst nur TP vs SL, Expired/Open zeigen Reife des Beobachtungsfensters.
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {ALLOWED_DAYS.map((value) => (
            <Link
              key={value}
              href={`/${locale}/admin/outcomes?days=${value}${assetId ? `&assetId=${assetId}` : ""}${
                playbookId ? `&playbookId=${playbookId}` : ""
              }${showNoTradeType ? "&showNoTradeType=1" : ""}`}
              className={`rounded-full px-3 py-1 font-semibold ${
                Number(value) === days ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              {value} Tage
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["", "gold-swing-v0.2", "index-swing-v0.1", "crypto-swing-v0.1", "fx-swing-v0.1", "generic-swing-v0.1"].map(
            (pb) => (
              <Link
                key={pb || "all"}
                href={`/${locale}/admin/outcomes?days=${days}${assetId ? `&assetId=${assetId}` : ""}${
                  pb ? `&playbookId=${pb}` : ""
                }${showNoTradeType ? "&showNoTradeType=1" : ""}`}
                className={`rounded-full px-3 py-1 font-semibold ${
                  pb === (playbookId ?? "") ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-200"
                }`}
              >
                {pb || "Alle Playbooks"}
              </Link>
            ),
          )}
        </div>
        <OutcomesExportButtons
          days={days}
          assetId={assetId}
          playbookId={playbookId}
          showNoTradeType={showNoTradeType}
          locale={locale}
        />
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
            <Metric
              label={
                <div className="flex items-center gap-1">
                  <span>Win-Rate (TP vs SL)</span>
                  <InfoTooltip
                    label="Win-Rate"
                    text="TP / (TP+SL) für Grade A/B. OPEN, EXPIRED, AMBIGUOUS und NO_TRADE sind nicht enthalten."
                  />
                </div>
              }
              value={formatRate(stats.winRate)}
            />
            <Metric
              label={
                <div className="flex items-center gap-1">
                  <span>Expired Anteil</span>
                  <InfoTooltip
                    label="Expired"
                    text="Expired / (TP+SL+Expired). Misst Timing-Qualität, kein Signalfehler."
                  />
                </div>
              }
              value={formatRate(stats.expiredShare)}
            />
            <Metric
              label={
                <div className="flex items-center gap-1">
                  <span>Ambiguous Anteil</span>
                  <InfoTooltip label="Ambiguous" text="TP und SL im selben Candle. Zählt nicht in die Win-Rate." />
                </div>
              }
              value={formatRate(stats.ambiguousShare)}
            />
            <Metric
              label={
                <div className="flex items-center gap-1">
                  <span>Samples</span>
                  <InfoTooltip
                    label="Samples"
                    text="Anzahl Outcomes im Fenster. Beinhaltet A/B-Setups; NO_TRADE wird separat im Grade-Bucket gezeigt."
                  />
                </div>
              }
              value={`${Object.values(stats.totals).reduce((a, b) => a + b, 0)}`}
            />
          </div>
        </Card>
      </section>

      {stats.noTradeReasonCounts ? (
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Top-KOs (NO_TRADE)</h2>
            <span className="text-xs text-slate-400">Gründe aus NO_TRADE-Setups im aktuellen Filterfenster</span>
          </div>
          <div className="mt-3 space-y-1 text-sm text-slate-200">
            {Object.entries(stats.noTradeReasonCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([reason, count]) => (
                <div key={reason} className="flex justify-between rounded bg-slate-900/60 px-3 py-2">
                  <span className="text-slate-300">{reason}</span>
                  <span className="font-semibold text-white">{count}</span>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Kuerzlich evaluierte Setups</h2>
        <div className="text-xs text-slate-400">
          SetupType beschreibt das Marktregime (z. B. Range vs Pullback). Handelbarkeit wird über Grade entschieden.
          Deshalb kann ein Setup als range_bias markiert sein und trotzdem NO_TRADE sein (z. B. Trend &lt; 50).
        </div>
        <div className="text-xs">
          <Link
            href={`/${locale}/admin/outcomes?days=${days}${assetId ? `&assetId=${assetId}` : ""}${
              playbookId ? `&playbookId=${playbookId}` : ""
            }${showNoTradeType ? "" : "&showNoTradeType=1"}`}
            className="rounded bg-slate-800 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-700"
          >
            {showNoTradeType ? "SetupType auch bei NO_TRADE anzeigen (an)" : "SetupType bei NO_TRADE anzeigen"}
          </Link>
          {showNoTradeType ? (
            <span className="ml-3 text-slate-400">Toggle aktiv: SetupType wird auch bei NO_TRADE angezeigt.</span>
          ) : (
            <span className="ml-3 text-slate-400">Toggle aus: Bei NO_TRADE wird SetupType ausgeblendet.</span>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
            <thead className="bg-slate-900/60">
              <tr>
                {["Evaluated", "Asset", "Snapshot", "Grade", "Type", "Outcome", "Bars"].map((h) => (
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
                  <td className="px-3 py-2 text-xs text-slate-300">
                    <div className="font-mono">
                      {row.snapshotShortId ?? row.snapshotId.slice(0, 6)}
                      <span className="text-slate-500">…</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {row.snapshotTime
                        ? row.snapshotTime.toISOString().slice(0, 19).replace("T", " ")
                        : row.snapshotCreatedAt
                          ? row.snapshotCreatedAt.toISOString().slice(0, 19).replace("T", " ")
                          : "-"}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-semibold">{row.setupGrade ?? "-"}</td>
                  <td className="px-3 py-2">
                    {showNoTradeType || row.setupGrade !== "NO_TRADE" ? row.setupType ?? "-" : "—"}
                  </td>
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

function Metric({ label, value }: { label: React.ReactNode; value: string }) {
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
