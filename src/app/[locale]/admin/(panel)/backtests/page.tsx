import Link from "next/link";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import type { BacktestRunMeta } from "@/src/server/repositories/backtestRunRepository";
import { getBacktestRunByKey, listRecentBacktestRunsMeta } from "@/src/server/repositories/backtestRunRepository";
import type { CompletedTrade } from "@/src/domain/backtest/types";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import TradesTable from "./TradesTableClient";
import { RunBacktestForm } from "./RunBacktestForm";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type KpisLike = {
  trades?: number;
  winRate?: number;
  netPnl?: number;
  avgPnl?: number;
  maxDrawdown?: number;
};

type CompareDelta = {
  trades?: number;
  winRate?: number;
  netPnl?: number;
  avgPnl?: number;
  maxDrawdown?: number;
};

type SummaryCounts = {
  wins: number;
  losses: number;
  reasons: Record<string, number>;
};

type AssetOption = {
  id: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  assetClass: string;
};

function parseRunKey(runKey: string): { snapshotMode: "live" | "playback" | "unknown" } {
  if (!runKey.startsWith("bk|")) return { snapshotMode: "unknown" };
  const payload = runKey.slice(3);
  try {
    const json = JSON.parse(payload);
    const mode = (json as { snapshotMode?: string }).snapshotMode;
    if (mode === "playback") return { snapshotMode: "playback" };
    if (mode === "live") return { snapshotMode: "live" };
    return { snapshotMode: "live" };
  } catch {
    return { snapshotMode: "unknown" };
  }
}

function asKpis(value: unknown): KpisLike | null {
  if (value && typeof value === "object") return value as KpisLike;
  return null;
}

function formatDate(value: Date | string | null | undefined, locale: Locale): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale === "de" ? "de-DE" : "en-US");
}

function formatNumber(value: number | null | undefined, fractionDigits = 2): string {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toLocaleString("en-US", { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits });
}

function computeEquity(trades: CompletedTrade[]): number[] {
  const equity: number[] = [];
  let acc = 0;
  trades.forEach((trade) => {
    acc += trade.pnl?.netPnl ?? 0;
    equity.push(acc);
  });
  return equity;
}

function computeReasonCounts(trades: CompletedTrade[]): SummaryCounts {
  const reasons: Record<string, number> = {};
  let wins = 0;
  let losses = 0;
  trades.forEach((t) => {
    const reasonKey = t.reason ?? "unknown";
    reasons[reasonKey] = (reasons[reasonKey] ?? 0) + 1;
    if (t.pnl?.netPnl != null) {
      if (t.pnl.netPnl > 0) wins += 1;
      else if (t.pnl.netPnl < 0) losses += 1;
    }
  });
  return { wins, losses, reasons };
}

function computeDelta(a: KpisLike | null, b: KpisLike | null): CompareDelta {
  if (!a && !b) return {};
  const delta: CompareDelta = {};
  const metrics: (keyof CompareDelta)[] = ["trades", "winRate", "netPnl", "avgPnl", "maxDrawdown"];
  metrics.forEach((m) => {
    const av = a?.[m];
    const bv = b?.[m];
    if (av != null && bv != null) {
      delta[m] = bv - av;
    }
  });
  return delta;
}

function clampLimit(raw?: string | string[]): number {
  const n = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isFinite(n)) return 50;
  return Math.min(200, Math.max(1, Math.trunc(n)));
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

async function safeGetRun(runKey: string) {
  try {
    return await getBacktestRunByKey(runKey);
  } catch (error) {
    console.error("Failed to load backtest run", { runKey, error });
    return null;
  }
}

export default async function AdminBacktestsPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const t = (key: string, fallback: string) => (messages as Record<string, string>)[key] ?? fallback;

  const resolvedSearch = (await searchParams) ?? {};
  const limit = clampLimit(resolvedSearch.limit);

  let runs: BacktestRunMeta[] = [];
  let loadError: string | null = null;
  try {
    runs = await listRecentBacktestRunsMeta(limit);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to load backtest runs";
    const lowered = message.toLowerCase();
    if (lowered.includes("backtest_runs") && lowered.includes("relation")) {
      loadError = "DB table backtest_runs missing. Please run migrations (drizzle/0004_add_backtest_runs.sql).";
    } else {
      loadError = message;
    }
  }

  const primaryKey = typeof resolvedSearch.runKey === "string" ? resolvedSearch.runKey : runs[0]?.runKey;
  const compareKey = typeof resolvedSearch.compare === "string" ? resolvedSearch.compare : undefined;
  const prefillKey = typeof resolvedSearch.prefill === "string" ? resolvedSearch.prefill : undefined;
  const assetFilter = typeof resolvedSearch.asset === "string" ? resolvedSearch.asset : "all";
  const stepFilter = typeof resolvedSearch.step === "string" ? resolvedSearch.step : "all";
  const sortKey = typeof resolvedSearch.sort === "string" ? resolvedSearch.sort : "createdAt";
  const searchTerm = typeof resolvedSearch.q === "string" ? resolvedSearch.q.toLowerCase() : "";
  const modeFilter = typeof resolvedSearch.mode === "string" ? resolvedSearch.mode : "all";

  const primary = primaryKey ? await safeGetRun(primaryKey) : null;
  const secondary = compareKey ? await safeGetRun(compareKey) : null;
  const prefill = prefillKey ? await safeGetRun(prefillKey) : null;

  const assetOptions: AssetOption[] = (await getActiveAssets()).map((a) => ({
    id: a.id,
    symbol: a.symbol,
    displaySymbol: a.displaySymbol,
    name: a.name,
    assetClass: a.assetClass,
  }));

  const filteredRuns = runs
    .filter((run) => (assetFilter === "all" ? true : run.assetId === assetFilter))
    .filter((run) => (stepFilter === "all" ? true : String(run.stepHours) === stepFilter))
    .filter((run) => {
      if (modeFilter === "all") return true;
      const mode = parseRunKey(run.runKey).snapshotMode === "playback" ? "playback" : "live";
      return mode === modeFilter;
    })
    .filter((run) =>
      searchTerm
        ? [run.runKey, run.fromIso ?? "", run.toIso ?? "", run.assetId ?? ""].some((v) => v.toLowerCase().includes(searchTerm))
        : true,
    );

  const sorters: Record<string, (a: BacktestRunMeta, b: BacktestRunMeta) => number> = {
    createdAt: (a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return (b.runKey ?? "").localeCompare(a.runKey ?? "");
    },
    netPnl: (a, b) => ((asKpis(b.kpis)?.netPnl ?? 0) - (asKpis(a.kpis)?.netPnl ?? 0)) || sorters.createdAt(a, b),
    winRate: (a, b) => ((asKpis(b.kpis)?.winRate ?? 0) - (asKpis(a.kpis)?.winRate ?? 0)) || sorters.createdAt(a, b),
    maxDrawdown: (a, b) => ((asKpis(a.kpis)?.maxDrawdown ?? 0) - (asKpis(b.kpis)?.maxDrawdown ?? 0)) || sorters.createdAt(a, b),
  };
  const sorter = sorters[sortKey] ?? sorters.createdAt;
  const visibleRuns = [...filteredRuns].sort(sorter);

  const primaryTrades = (primary?.trades as CompletedTrade[] | undefined) ?? [];
  const secondaryTrades = (secondary?.trades as CompletedTrade[] | undefined) ?? [];
  const equityA = computeEquity(primaryTrades);
  const equityB = computeEquity(secondaryTrades);
  const kpisA = asKpis(primary?.kpis);
  const kpisB = asKpis(secondary?.kpis);
  const delta = computeDelta(kpisA, kpisB);
  const summaryA = computeReasonCounts(primaryTrades);
  const summaryB = computeReasonCounts(secondaryTrades);
  const buildExportUrl = (runKey: string, type: "trades" | "kpis") =>
    `/${locale}/api/admin/backtest/runs/${encodeURIComponent(runKey)}/export?type=${type}`;
  const buildCompareExportUrl = (a: string, b: string, type: "kpis" | "summary" | "all") =>
    `/${locale}/api/admin/backtest/compare/export?primary=${encodeURIComponent(a)}&secondary=${encodeURIComponent(b)}&type=${type}`;

  const formatCosts = (run: BacktestRunMeta | null) => {
    if (!run) return "";
    const costs = (run.costsConfig as { feeBps?: number; slippageBps?: number } | null | undefined) ?? null;
    const exitPolicy = (run.exitPolicy as { holdSteps?: number } | null | undefined) ?? null;
    const fee = costs?.feeBps ?? 0;
    const slip = costs?.slippageBps ?? 0;
    const hold = exitPolicy?.holdSteps ?? 3;
    return `fee ${fee}bps | slip ${slip}bps | hold ${hold}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{t("admin.backtest.runs.title", "Backtest Runs")}</h1>
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)] space-y-2">
          <div className="text-base font-semibold text-white">Was diese Seite macht</div>
          <ul className="list-disc pl-4 space-y-1">
            <li>Backtest-Runs sind deterministische Simulationen. Der <code>runKey</code> ist die Identität aus Parametern (Asset, Zeitraum, Step, Kosten, Exit).</li>
            <li>Links: Liste aller Runs mit Meta + KPIs, Detail mit Trades &amp; Equity, Compare-Ansicht (A/B + Delta).</li>
            <li>Aktionen: neuen Run starten (Asset/Zeitraum/Step + Fee/Slippage + HoldSteps), Runs vergleichen, CSV-Export für Trades/KPIs oder Compare-Delta.</li>
            <li>Hinweise: Wenn Trades = 0, gab es keine Entries im Zeitraum (kein Fehler). Gleiche Parameter ergeben denselben runKey (idempotent).</li>
            <li>Falls keine Runs geladen werden: Datenbank-Migrationen prüfen (z.B. <code>npm run db:status</code> / <code>npm run db:migrate</code>).</li>
          </ul>
          <div className="pt-2 text-base font-semibold text-white">Glossary</div>
          <ul className="list-disc pl-4 space-y-1">
            <li>Trades: Anzahl ausgeführter Trades (nur gefüllte Entries zählen).</li>
            <li>Wins/Losses: Trades mit netPnl &gt; 0 / &lt; 0.</li>
            <li>WinRate: Wins / Trades in Prozent.</li>
            <li>NetPnL: Summe aller netPnl nach Fees/Slippage.</li>
            <li>AvgPnL: Durchschnittlicher netPnl pro Trade.</li>
            <li>MaxDD: Größter Rueckgang der Equity-Kurve vom Hoch zum Tief.</li>
            <li>Fee (bps): Gebühr pro Ausführung in Basispunkten (1 bps = 0.01%), angewendet auf Entry und Exit.</li>
            <li>Slippage (bps): Preisabweichung pro Ausführung in Basispunkten, angewendet auf Entry und Exit.</li>
            <li>Hold Steps: Exit-Regel, Position wird nach N Steps geschlossen.</li>
            <li>Step Hours: Abstand zwischen Backtest-Schritten (z.B. 4h), steuert Entry/Exit-Takt und Candle-Lookups.</li>
            <li>Snapshot source: LIVE = recompute aus aktuellen Daten, PLAYBACK = nutzt gespeicherte Snapshot-Items.</li>
            <li>runKey: deterministischer Schlüssel aus Parametern; gleiche Parameter ergeben denselben runKey.</li>
            <li>0 trades: gültiges Ergebnis, wenn keine Signale oder kein Fill zustande kam.</li>
          </ul>
        </div>
        <RunBacktestForm
          locale={locale}
          assets={assetOptions}
          defaultValues={
            prefill
              ? {
                  assetId: prefill.assetId ?? "btc",
                  fromDate: prefill.fromIso ? prefill.fromIso.slice(0, 10) : "",
                  toDate: prefill.toIso ? prefill.toIso.slice(0, 10) : "",
                  stepHours: prefill.stepHours ?? 4,
                  feeBps: (prefill.costsConfig as { feeBps?: number } | null | undefined)?.feeBps ?? 0,
                  slippageBps: (prefill.costsConfig as { slippageBps?: number } | null | undefined)?.slippageBps ?? 0,
                  holdSteps: (prefill.exitPolicy as { holdSteps?: number } | null | undefined)?.holdSteps ?? 3,
                }
              : undefined
          }
        />

        <FilterPanel
          locale={locale}
          assets={unique(runs.map((r) => r.assetId).filter(Boolean))}
          stepHours={unique(runs.map((r) => String(r.stepHours)))}
          current={{ asset: assetFilter, step: stepFilter, sort: sortKey, limit, search: searchTerm, mode: modeFilter }}
          runKey={primaryKey}
          compareKey={compareKey}
        />

        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
          {loadError && <div className="text-sm text-rose-300">Error loading runs: {loadError}</div>}
          {visibleRuns.length === 0 && !loadError && <div className="text-sm text-[var(--text-secondary)]">No runs found.</div>}
          {visibleRuns.map((run) => {
            const baseParams = new URLSearchParams();
            baseParams.set("runKey", run.runKey);
            if (compareKey) baseParams.set("compare", compareKey);
            baseParams.set("limit", String(limit));
            const href = `/${locale}/admin/backtests?${baseParams.toString()}`;
            const compareParams = new URLSearchParams();
            compareParams.set("runKey", primaryKey ?? run.runKey);
            compareParams.set("compare", run.runKey);
            compareParams.set("limit", String(limit));
            const compareHref = `/${locale}/admin/backtests?${compareParams.toString()}`;
            const cloneParams = new URLSearchParams(baseParams);
            cloneParams.set("prefill", run.runKey);
            const isActive = run.runKey === primaryKey;
            const kpis = asKpis(run.kpis);
            const mode = parseRunKey(run.runKey).snapshotMode === "playback" ? "playback" : "live";
            const cardClass = `rounded-md px-3 py-2 transition ${
              isActive ? "bg-white/10 border border-white/20" : "hover:bg-white/5"
            }`;
            return (
              <div key={run.runKey} className={cardClass}>
                <Link href={href} className="block">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{run.assetId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.65rem] rounded px-2 py-[2px] border border-white/20 uppercase">
                        {mode === "playback" ? "PLAYBACK" : "LIVE"}
                      </span>
                      <span className="text-[var(--text-secondary)]">{run.stepHours}h</span>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {run.fromIso} {"->"} {run.toIso}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {formatDate(run.createdAt ?? null, locale)}
                    {kpis?.netPnl != null ? ` | PnL ${formatNumber(kpis.netPnl)}` : ""}
                  </div>
                  <div className="text-[0.7rem] text-[var(--text-secondary)]">{formatCosts(run)}</div>
                </Link>
                <div className="mt-1 flex flex-wrap gap-3 text-[0.7rem] text-[var(--text-secondary)]">
                  <Link href={compareHref} className="underline">
                    Compare
                  </Link>
                  {compareKey && run.runKey === compareKey && (
                    <Link href={`/${locale}/admin/backtests?runKey=${encodeURIComponent(primaryKey ?? "")}`} className="underline">
                      Clear
                    </Link>
                  )}
                  <Link href={`/${locale}/admin/backtests?${cloneParams.toString()}`} className="underline">
                    Clone to form
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {t("admin.backtest.runs.detail", "Run Detail")} {primaryKey ? `(${primaryKey})` : ""}
          </h2>
          {compareKey && <span className="text-xs text-[var(--text-secondary)]">Compare: {compareKey}</span>}
        </div>

        {!primary && <div className="text-sm text-[var(--text-secondary)]">Select a run to view details.</div>}

        {primary && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">Exports:</span>
              <a
                className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                href={buildExportUrl(primary.runKey, "trades")}
              >
                Primary Trades CSV
              </a>
              <a
                className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                href={buildExportUrl(primary.runKey, "kpis")}
              >
                Primary KPIs CSV
              </a>
              {compareKey && secondary && (
                <>
                  <a
                    className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                    href={buildExportUrl(secondary.runKey, "trades")}
                  >
                    Compare Trades CSV
                  </a>
                  <a
                    className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                    href={buildExportUrl(secondary.runKey, "kpis")}
                  >
                    Compare KPIs CSV
                  </a>
                  <a
                    className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-100 hover:bg-amber-500/30"
                    href={buildCompareExportUrl(primary.runKey, secondary.runKey, "summary")}
                  >
                    Export Compare (summary CSV)
                  </a>
                </>
              )}
            </div>

            <KpiTable a={kpisA} b={kpisB} delta={delta} />

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-2 text-sm font-semibold">Equity Curve</h3>
              <EquityOverlay a={equityA} b={equityB} />
            </div>

            <MiniSummary kpis={kpisA} />

            <TradeSummary label="Primary" summary={summaryA} />
            {compareKey && secondary && <TradeSummary label="Compare" summary={summaryB} />}

            <TradesTable trades={primaryTrades} title="Trades (primary)" />
            {compareKey && secondaryTrades.length > 0 && <TradesTable trades={secondaryTrades} title="Trades (compare)" />}
          </>
        )}
      </div>
    </div>
  );
}

function FilterPanel({
  assets,
  stepHours,
  locale,
  current,
  runKey,
  compareKey,
}: {
  assets: string[];
  stepHours: string[];
  locale: Locale;
  current: { asset: string; step: string; sort: string; limit: number; search: string; mode: string };
  runKey?: string;
  compareKey?: string;
}) {
  return (
    <form method="get" className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 text-xs">
      {runKey && <input type="hidden" name="runKey" value={runKey} />}
      {compareKey && <input type="hidden" name="compare" value={compareKey} />}
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1">
          Asset
          <select name="asset" defaultValue={current.asset} className="rounded border border-white/10 bg-slate-900 px-2 py-1">
            <option value="all">all</option>
            {assets.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Step
          <select name="step" defaultValue={current.step} className="rounded border border-white/10 bg-slate-900 px-2 py-1">
            <option value="all">all</option>
            {stepHours.map((s) => (
              <option key={s} value={s}>
                {s}h
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Sort
          <select name="sort" defaultValue={current.sort} className="rounded border border-white/10 bg-slate-900 px-2 py-1">
            <option value="createdAt">createdAt desc</option>
            <option value="netPnl">netPnl desc</option>
            <option value="winRate">winRate desc</option>
            <option value="maxDrawdown">maxDrawdown asc</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          Mode
          <select name="mode" defaultValue={current.mode} className="rounded border border-white/10 bg-slate-900 px-2 py-1">
            <option value="all">all</option>
            <option value="live">live</option>
            <option value="playback">playback</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          Limit
          <select name="limit" defaultValue={String(current.limit)} className="rounded border border-white/10 bg-slate-900 px-2 py-1">
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 flex-1 min-w-[140px]">
          Search
          <input
            name="q"
            defaultValue={current.search}
            className="flex-1 rounded border border-white/10 bg-slate-900 px-2 py-1"
            placeholder="runKey or date"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20">
          Apply
        </button>
        <Link href={`/${locale}/admin/backtests`} className="text-xs text-[var(--text-secondary)] underline">
          Reset filters
        </Link>
      </div>
      <div className="text-[0.65rem] text-[var(--text-secondary)]">Sort tie-breaker: createdAt desc, then runKey.</div>
    </form>
  );
}

function KpiTable({ a, b, delta }: { a: KpisLike | null; b: KpisLike | null; delta: CompareDelta }) {
  const rows: Array<{ key: keyof CompareDelta; label: string }> = [
    { key: "trades", label: "Trades" },
    { key: "winRate", label: "Win rate" },
    { key: "netPnl", label: "Net PnL" },
    { key: "avgPnl", label: "Avg PnL" },
    { key: "maxDrawdown", label: "Max Drawdown" },
  ];
  const fmt = (key: keyof CompareDelta, val?: number) => {
    if (val == null) return "-";
    if (key === "winRate") return `${formatNumber(val * 100, 1)}%`;
    return formatNumber(val);
  };
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 overflow-x-auto">
      <h3 className="mb-3 text-sm font-semibold">KPIs</h3>
      <table className="min-w-full text-sm">
        <thead className="text-left text-[var(--text-secondary)]">
          <tr>
            <th className="px-2 py-1">Metric</th>
            <th className="px-2 py-1">Run A</th>
            <th className="px-2 py-1">Run B</th>
            <th className="px-2 py-1">Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-white/5">
              <td className="px-2 py-1">{row.label}</td>
              <td className="px-2 py-1">{fmt(row.key, a?.[row.key])}</td>
              <td className="px-2 py-1">{fmt(row.key, b?.[row.key])}</td>
              <td className="px-2 py-1">{fmt(row.key, delta[row.key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EquityOverlay({ a, b }: { a: number[]; b: number[] }) {
  if (!a.length && !b.length) return <div className="text-sm text-[var(--text-secondary)]">No equity data</div>;
  const width = 200;
  const height = 80;
  const min = Math.min(...(a.length ? a : [0]), ...(b.length ? b : [0]));
  const max = Math.max(...(a.length ? a : [0]), ...(b.length ? b : [0]));
  const span = Math.max(max - min, 1e-6);
  const toPoints = (series: number[]) =>
    series
      .map((p, idx) => {
        const x = (idx / Math.max(series.length - 1, 1)) * width;
        const y = height - ((p - min) / span) * height;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
      {a.length > 0 && <polyline fill="none" stroke="currentColor" strokeWidth="2" points={toPoints(a)} className="text-emerald-400" />}
      {b.length > 0 && <polyline fill="none" stroke="orange" strokeWidth="2" points={toPoints(b)} />}
    </svg>
  );
}

function MiniSummary({ kpis }: { kpis: KpisLike | null }) {
  if (!kpis) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm flex flex-wrap gap-3">
      <span>Trades: {kpis.trades ?? "-"}</span>
      <span>WinRate: {kpis.winRate != null ? `${formatNumber(kpis.winRate * 100, 1)}%` : "-"}</span>
      <span>NetPnL: {kpis.netPnl != null ? formatNumber(kpis.netPnl) : "-"}</span>
      <span>MaxDD: {kpis.maxDrawdown != null ? formatNumber(kpis.maxDrawdown) : "-"}</span>
      <span>AvgPnL: {kpis.avgPnl != null ? formatNumber(kpis.avgPnl) : "-"}</span>
    </div>
  );
}

function TradeSummary({ label, summary }: { label: string; summary: SummaryCounts }) {
  const total = summary.wins + summary.losses || Object.values(summary.reasons).reduce((a, b) => a + b, 0);
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-2 text-sm font-semibold">{label} summary</h3>
      <div className="flex gap-4 text-sm">
        <span>Wins: {summary.wins}</span>
        <span>Losses: {summary.losses}</span>
      </div>
      <div className="mt-2 text-sm">
        Reasons:
        <ul className="mt-1 list-disc pl-4 text-[var(--text-secondary)]">
          {Object.keys(summary.reasons).length === 0 && <li>none</li>}
          {Object.entries(summary.reasons).map(([reason, count]) => {
            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
            return (
              <li key={reason}>
                {reason}: {count} ({pct}%)
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
