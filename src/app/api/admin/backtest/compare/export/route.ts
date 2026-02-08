import { NextResponse, type NextRequest } from "next/server";
import { isAdminEnabled, validateAdminRequestOrigin } from "@/src/lib/admin/security";
import { getBacktestRunByKey } from "@/src/server/repositories/backtestRunRepository";
import { toCsv } from "@/src/server/utils/csv";
import type { BacktestKpis, CompletedTrade } from "@/src/domain/backtest/types";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";

type ExportType = "kpis" | "summary" | "all";

function clampNumber(value: number | null | undefined, digits: number): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(digits);
}

function asKpis(value: unknown): BacktestKpis | null {
  if (value && typeof value === "object") return value as BacktestKpis;
  return null;
}

function asTrades(value: unknown): CompletedTrade[] {
  if (Array.isArray(value)) return value as CompletedTrade[];
  return [];
}

function metricRows(a: BacktestKpis | null, b: BacktestKpis | null): string[][] {
  const rows: Array<[string, number | null, number | null]> = [
    ["trades", a?.trades ?? 0, b?.trades ?? 0],
    ["wins", a?.wins ?? 0, b?.wins ?? 0],
    ["losses", a?.losses ?? 0, b?.losses ?? 0],
    ["winRate_pct", (a?.winRate ?? 0) * 100, (b?.winRate ?? 0) * 100],
    ["netPnl", a?.netPnl ?? 0, b?.netPnl ?? 0],
    ["avgPnl", a?.avgPnl ?? 0, b?.avgPnl ?? 0],
    ["maxDrawdown", a?.maxDrawdown ?? 0, b?.maxDrawdown ?? 0],
  ];
  return rows.map(([metric, av, bv]) => {
    const delta = (bv ?? 0) - (av ?? 0);
    const digits = metric === "winRate_pct" ? 2 : 6;
    return [metric, clampNumber(av, digits), clampNumber(bv, digits), clampNumber(delta, digits)];
  });
}

function runMetaRow(run: Awaited<ReturnType<typeof getBacktestRunByKey>> | undefined): string[] {
  const costs = (run?.costsConfig as { feeBps?: number; slippageBps?: number } | null | undefined) ?? null;
  const exitPolicy = (run?.exitPolicy as { kind?: string; holdSteps?: number } | null | undefined) ?? null;
  return [
    run?.runKey ?? "",
    run?.assetId ?? "",
    run?.fromIso ?? "",
    run?.toIso ?? "",
    run?.stepHours != null ? String(run.stepHours) : "",
    costs?.feeBps != null ? String(costs.feeBps) : "",
    costs?.slippageBps != null ? String(costs.slippageBps) : "",
    exitPolicy?.kind ?? "",
    exitPolicy?.holdSteps != null ? String(exitPolicy.holdSteps) : "",
  ];
}

function reasonCounts(trades: CompletedTrade[]): Record<string, number> {
  const counts: Record<string, number> = {};
  trades.forEach((t) => {
    const key = t.reason ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}

function winsLosses(trades: CompletedTrade[]): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;
  trades.forEach((t) => {
    const net = t.pnl?.netPnl;
    if (net != null) {
      if (net > 0) wins += 1;
      else if (net < 0) losses += 1;
    }
  });
  return { wins, losses };
}

function sectionCsv(title: string, headers: string[], rows: string[][]): string {
  return [`# ${title}`, toCsv(headers, rows)].join("\n");
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  if (!isAdminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin disabled" }, { status: 404 });
  }
  let auth;
  try {
    auth = await requireAdminOrCron(request, { allowCron: true, allowAdminToken: true });
  } catch (error) {
    const unauthorized = asUnauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (auth.mode === "admin" && !validateAdminRequestOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const primaryKey = params.get("primary");
  const secondaryKey = params.get("secondary");
  const type = (params.get("type") as ExportType | null) ?? "kpis";

  if (!primaryKey || !secondaryKey) {
    return NextResponse.json({ ok: false, error: "primary and secondary required" }, { status: 400 });
  }
  if (primaryKey === secondaryKey) {
    return NextResponse.json({ ok: false, error: "primary and secondary must differ" }, { status: 400 });
  }

  const [a, b] = await Promise.all([getBacktestRunByKey(primaryKey), getBacktestRunByKey(secondaryKey)]);
  if (!a || !b) {
    return NextResponse.json({ ok: false, error: "run not found" }, { status: 404 });
  }

  const kpisA = asKpis(a.kpis);
  const kpisB = asKpis(b.kpis);
  const tradesA = asTrades(a.trades);
  const tradesB = asTrades(b.trades);

  const kpiHeaders = ["metric", "a", "b", "delta"];
  const kpiRows = metricRows(kpisA, kpisB);
  const kpiCsv = toCsv(kpiHeaders, kpiRows);

  const metaHeaders = ["runKey", "assetId", "fromIso", "toIso", "stepHours", "feeBps", "slippageBps", "exitKind", "holdSteps"];
  const reasonsKeys = Array.from(
    new Set([...Object.keys(reasonCounts(tradesA)), ...Object.keys(reasonCounts(tradesB))].sort()),
  );
  const reasonRows = reasonsKeys.map((key) => {
    const aCount = reasonCounts(tradesA)[key] ?? 0;
    const bCount = reasonCounts(tradesB)[key] ?? 0;
    return [key, String(aCount), String(bCount), String(bCount - aCount)];
  });

  const winsA = winsLosses(tradesA);
  const winsB = winsLosses(tradesB);

  let body = "";
  if (type === "kpis") {
    body = kpiCsv;
  } else if (type === "summary") {
    body = [sectionCsv("RUN A", metaHeaders, [runMetaRow(a)]), sectionCsv("RUN B", metaHeaders, [runMetaRow(b)]), sectionCsv("KPI DELTA", kpiHeaders, kpiRows)].join(
      "\n\n",
    );
  } else {
    body = [
      sectionCsv("RUN A", metaHeaders, [runMetaRow(a)]),
      sectionCsv("RUN B", metaHeaders, [runMetaRow(b)]),
      sectionCsv("KPI DELTA", kpiHeaders, kpiRows),
      sectionCsv("REASONS", ["reason", "a", "b", "delta"], reasonRows),
      sectionCsv("WINS_LOSSES", ["metric", "a", "b", "delta"], [
        ["wins", String(winsA.wins), String(winsB.wins), String(winsB.wins - winsA.wins)],
        ["losses", String(winsA.losses), String(winsB.losses), String(winsB.losses - winsA.losses)],
      ]),
    ].join("\n\n");
  }

  const filename = `backtest_compare_${a.assetId}_${a.fromIso}_${a.toIso}__vs__${b.assetId}_${b.fromIso}_${b.toIso}_${type}.csv`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  await createAuditRun({
    action: "admin_backtest_compare_export",
    source: auth.mode,
    ok: true,
    durationMs: Date.now() - startedAt,
    message: "backtest_compare_export_success",
    meta: buildAuditMeta({
      auth,
      request: { method: request.method, url: request.url },
      params: { primaryKey, secondaryKey, type },
      result: { ok: true, bytes: body.length },
    }),
  });
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
