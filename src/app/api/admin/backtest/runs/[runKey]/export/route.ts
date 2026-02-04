import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { isAdminSessionFromRequest } from "@/src/lib/admin/auth";
import { getBacktestRunByKey } from "@/src/server/repositories/backtestRunRepository";
import { escapeCsvCell, toCsv } from "@/src/server/utils/csv";
import type { CompletedTrade, BacktestKpis } from "@/src/domain/backtest/types";

type ExportType = "trades" | "kpis" | "all";

function formatNumber(value: number | null | undefined, digits = 6): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(digits);
}

function buildTradesCsv(runKey: string, assetId: string, trades: CompletedTrade[]): string {
  const headers = [
    "runKey",
    "assetId",
    "side",
    "entryIso",
    "entryPrice",
    "exitIso",
    "exitPrice",
    "barsHeld",
    "reason",
    "grossPnl",
    "fees",
    "slippage",
    "netPnl",
  ];
  const rows = trades.map((t) => [
    runKey,
    assetId,
    t.side ?? "",
    t.entry?.iso ?? "",
    formatNumber(t.entry?.price, 6),
    t.exit?.iso ?? "",
    formatNumber(t.exit?.price, 6),
    t.barsHeld != null ? String(t.barsHeld) : "",
    t.reason ?? "",
    formatNumber(t.pnl?.grossPnl, 6),
    formatNumber(t.pnl?.fees, 6),
    formatNumber(t.pnl?.slippage, 6),
    formatNumber(t.pnl?.netPnl, 6),
  ]);
  return toCsv(headers, rows);
}

function buildKpisCsv(
  runKey: string,
  assetId: string,
  fromIso: string,
  toIso: string,
  stepHours: number,
  kpis: BacktestKpis | null | undefined,
  costs: { feeBps?: number; slippageBps?: number } | null | undefined,
  exitPolicy: { kind?: string; holdSteps?: number } | null | undefined,
): string {
  const headers = [
    "runKey",
    "assetId",
    "fromIso",
    "toIso",
    "stepHours",
    "trades",
    "wins",
    "losses",
    "winRate",
    "netPnl",
    "avgPnl",
    "maxDrawdown",
    "feeBps",
    "slippageBps",
    "exitKind",
    "holdSteps",
  ];
  const row = [
    runKey,
    assetId,
    fromIso,
    toIso,
    String(stepHours),
    kpis?.trades != null ? String(kpis.trades) : "",
    kpis?.wins != null ? String(kpis.wins) : "",
    kpis?.losses != null ? String(kpis.losses) : "",
    kpis?.winRate != null ? formatNumber(kpis.winRate, 4) : "",
    kpis?.netPnl != null ? formatNumber(kpis.netPnl, 6) : "",
    kpis?.avgPnl != null ? formatNumber(kpis.avgPnl, 6) : "",
    kpis?.maxDrawdown != null ? formatNumber(kpis.maxDrawdown, 6) : "",
    costs?.feeBps != null ? String(costs.feeBps) : "",
    costs?.slippageBps != null ? String(costs.slippageBps) : "",
    exitPolicy?.kind ?? "",
    exitPolicy?.holdSteps != null ? String(exitPolicy.holdSteps) : "",
  ];
  return toCsv(headers, [row]);
}

function buildAllCsv(
  runKey: string,
  assetId: string,
  run: Awaited<ReturnType<typeof getBacktestRunByKey>>,
  trades: CompletedTrade[],
  kpis: BacktestKpis | null | undefined,
): string {
  const kpisCsv = buildKpisCsv(
    runKey,
    assetId,
    run?.fromIso ?? "",
    run?.toIso ?? "",
    run?.stepHours ?? 0,
    kpis,
    (run?.costsConfig as { feeBps?: number; slippageBps?: number } | null | undefined) ?? null,
    (run?.exitPolicy as { kind?: string; holdSteps?: number } | null | undefined) ?? null,
  );
  const tradesCsv = buildTradesCsv(runKey, assetId, trades);
  const lines = ["# KPIS", kpisCsv, "", "# TRADES", tradesCsv];
  return lines.join("\n");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ runKey: string }> }) {
  const resolvedParams = await params;
  if (!isAdminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin disabled" }, { status: 404 });
  }
  if (!isAdminSessionFromRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!validateAdminRequestOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const runKey = resolvedParams.runKey;
  const type = (request.nextUrl.searchParams.get("type") as ExportType | null) ?? "trades";
  const run = await getBacktestRunByKey(runKey);
  if (!run) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const trades = (run.trades as CompletedTrade[] | null | undefined) ?? [];
  const kpis = (run.kpis as BacktestKpis | null | undefined) ?? null;
  let csv = "";
  if (type === "trades") {
    csv = buildTradesCsv(runKey, run.assetId, trades);
  } else if (type === "kpis") {
    csv = buildKpisCsv(
      runKey,
      run.assetId,
      run.fromIso,
      run.toIso,
      run.stepHours,
      kpis,
      (run.costsConfig as { feeBps?: number; slippageBps?: number } | null | undefined) ?? null,
      (run.exitPolicy as { kind?: string; holdSteps?: number } | null | undefined) ?? null,
    );
  } else {
    csv = buildAllCsv(runKey, run.assetId, run, trades, kpis);
  }

  const filename = `backtest_${escapeCsvCell(run.assetId)}_${escapeCsvCell(run.fromIso)}_${escapeCsvCell(
    run.toIso,
  )}_${run.stepHours}_${type}.csv`.replace(/"/g, "");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
