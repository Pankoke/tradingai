import Link from "next/link";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import type { BacktestRunMeta } from "@/src/server/repositories/backtestRunRepository";
import { getBacktestRunByKey, listRecentBacktestRunsMeta } from "@/src/server/repositories/backtestRunRepository";
import type { CompletedTrade } from "@/src/domain/backtest/types";

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

  let runs: BacktestRunMeta[] = [];
  let loadError: string | null = null;
  try {
    runs = await listRecentBacktestRunsMeta(50);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "failed to load backtest runs";
  }

  const resolvedSearch = (await searchParams) ?? {};
  const primaryKey = typeof resolvedSearch.runKey === "string" ? resolvedSearch.runKey : runs[0]?.runKey;
  const compareKey = typeof resolvedSearch.compare === "string" ? resolvedSearch.compare : undefined;

  const primary = primaryKey ? await safeGetRun(primaryKey) : null;
  const secondary = compareKey ? await safeGetRun(compareKey) : null;

  const primaryTrades = (primary?.trades as CompletedTrade[] | undefined) ?? [];
  const secondaryTrades = (secondary?.trades as CompletedTrade[] | undefined) ?? [];
  const equityA = computeEquity(primaryTrades);
  const equityB = computeEquity(secondaryTrades);
  const kpisA = asKpis(primary?.kpis);
  const kpisB = asKpis(secondary?.kpis);
  const delta = computeDelta(kpisA, kpisB);
  const summaryA = computeReasonCounts(primaryTrades);
  const summaryB = computeReasonCounts(secondaryTrades);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{t("admin.backtest.runs.title", "Backtest Runs")}</h1>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
          {loadError && <div className="text-sm text-rose-300">Error loading runs: {loadError}</div>}
          {runs.length === 0 && !loadError && <div className="text-sm text-[var(--text-secondary)]">No runs found.</div>}
          {runs.map((run) => {
            const href = `/${locale}/admin/backtests?runKey=${encodeURIComponent(run.runKey)}${compareKey ? `&compare=${encodeURIComponent(compareKey)}` : ""}`;
            const compareHref = `/${locale}/admin/backtests?runKey=${encodeURIComponent(primaryKey ?? run.runKey)}&compare=${encodeURIComponent(run.runKey)}`;
            const isActive = run.runKey === primaryKey;
            const kpis = asKpis(run.kpis);
            return (
              <div key={run.runKey} className={`rounded-md px-3 py-2 transition ${isActive ? "bg-white/10 border border-white/20" : "hover:bg-white/5"}`}>
                <Link href={href} className="block">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{run.assetId}</span>
                    <span className="text-[var(--text-secondary)]">{run.stepHours}h</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {run.fromIso} → {run.toIso}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {formatDate(run.createdAt ?? null, locale)}
                    {kpis?.netPnl != null ? ` · PnL ${formatNumber(kpis.netPnl)}` : ""}
                  </div>
                </Link>
                <div className="mt-1 flex gap-2 text-[0.7rem] text-[var(--text-secondary)]">
                  <Link href={compareHref} className="underline">
                    Compare
                  </Link>
                  {compareKey && run.runKey === compareKey && (
                    <Link href={`/${locale}/admin/backtests?runKey=${encodeURIComponent(primaryKey ?? "")}`} className="underline">
                      Clear
                    </Link>
                  )}
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
            <KpiTable a={kpisA} b={kpisB} delta={delta} />

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-2 text-sm font-semibold">Equity Curve</h3>
              <EquityOverlay a={equityA} b={equityB} />
            </div>

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

function TradeSummary({ label, summary }: { label: string; summary: SummaryCounts }) {
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
          {Object.entries(summary.reasons).map(([reason, count]) => (
            <li key={reason}>
              {reason}: {count}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TradesTable({ trades, title }: { trades: CompletedTrade[]; title: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {trades.length === 0 && <div className="text-sm text-[var(--text-secondary)]">No trades</div>}
      {trades.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[var(--text-secondary)]">
              <tr>
                <th className="px-2 py-1">Side</th>
                <th className="px-2 py-1">Entry</th>
                <th className="px-2 py-1">Exit</th>
                <th className="px-2 py-1">Bars</th>
                <th className="px-2 py-1">Reason</th>
                <th className="px-2 py-1">Net PnL</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, idx) => (
                <tr key={`${t.entry.iso}-${idx}`} className="border-t border-white/5">
                  <td className="px-2 py-1">{t.side}</td>
                  <td className="px-2 py-1">
                    <div>{t.entry.iso}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{formatNumber(t.entry.price, 4)}</div>
                  </td>
                  <td className="px-2 py-1">
                    <div>{t.exit.iso}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{formatNumber(t.exit.price, 4)}</div>
                  </td>
                  <td className="px-2 py-1">{t.barsHeld}</td>
                  <td className="px-2 py-1">{t.reason}</td>
                  <td className="px-2 py-1">{formatNumber(t.pnl?.netPnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
