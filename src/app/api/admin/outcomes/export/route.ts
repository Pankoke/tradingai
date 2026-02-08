import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { loadOutcomeExportRows } from "@/src/server/admin/outcomeService";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";

type OutcomeRow = Awaited<ReturnType<typeof loadOutcomeExportRows>>[number];

export async function GET(request: NextRequest): Promise<Response> {
  const startedAt = Date.now();
  let auth;
  try {
    auth = await requireAdminOrCron(request, { allowCron: true, allowAdminToken: true });
  } catch (error) {
    const unauthorized = asUnauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const params =
    "nextUrl" in request && request.nextUrl
      ? request.nextUrl.searchParams
      : new URL(request.url).searchParams;
  const days = parseInt(params.get("days") ?? "30", 10);
  const assetId = params.get("assetId") ?? undefined;
  const playbookId = params.get("playbookId") ?? undefined;
  const format = (params.get("format") ?? "csv").toLowerCase();
  const debug = params.get("debug") === "1";
  const mode = (params.get("mode") as "all" | "latest" | null) ?? "all";

  const rows = await loadOutcomeExportRows({ days, assetId, playbookId, mode });
  if (debug && format === "json") {
    const countsByPlaybookIdReturned = rows.reduce<Record<string, number>>((acc, row) => {
      const key = row.outcome.playbookId ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const distinctSetupIdsReturned = new Set(rows.map((r) => r.outcome.setupId)).size;

    // fetch totals without client-side limits
    const totals = await loadOutcomeExportRows({ days, assetId, playbookId, mode: "all" });
    const countsByPlaybookIdDb = totals.reduce<Record<string, number>>((acc, row) => {
      const key = row.outcome.playbookId ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const distinctSetupIdsDb = new Set(totals.map((r) => r.outcome.setupId)).size;

    const payload = {
      rows: rows.map((r) => mapRow(r)),
      countsByPlaybookId_returned: countsByPlaybookIdReturned,
      countsByPlaybookId_totalInDb: countsByPlaybookIdDb,
      totalRowsReturned: rows.length,
      totalRowsInDb: totals.length,
      distinctSetupIdsReturned,
      distinctSetupIdsInDb: distinctSetupIdsDb,
    };
    await createAuditRun({
      action: "admin_outcomes_export",
      source: auth.mode,
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "outcomes_export_debug_json_success",
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: { days, assetId, playbookId, format, mode, debug },
        result: { ok: true, rows: rows.length, bytes: JSON.stringify(payload).length },
      }),
    });
    return respondOk(payload);
  }
  const data = rows.map((row) => mapRow(row));

  if (format === "json") {
    await createAuditRun({
      action: "admin_outcomes_export",
      source: auth.mode,
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "outcomes_export_json_success",
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: { days, assetId, playbookId, format, mode, debug },
        result: { ok: true, rows: data.length, bytes: JSON.stringify(data).length },
      }),
    });
    return respondOk(data);
  }

  const header = [
    "evaluatedAt",
    "snapshotId",
    "setupId",
    "assetId",
    "timeframe",
    "profile",
    "direction",
    "playbookId",
    "setupGrade",
    "setupType",
    "gradeRationale",
    "noTradeReason",
    "gradeDebugReason",
    "outcomeStatus",
    "outcomeAt",
    "barsToOutcome",
    "reason",
    "entryZone",
    "stopLoss",
    "takeProfit",
    "confidence",
    "signalQuality",
    "trendScore",
    "biasScore",
    "orderflowScore",
    "sentimentScore",
    "eventModifier",
  ];

  const csvLines = [header.join(",")];
  for (const row of data) {
    const gradeRationale =
      Array.isArray(row.gradeRationale) && row.gradeRationale.length
        ? row.gradeRationale.join("|")
        : row.gradeRationale;
    const line = [
      quote(row.evaluatedAt),
      quote(row.snapshotId),
      quote(row.setupId),
      quote(row.assetId),
      quote(row.timeframe),
      quote(row.profile),
      quote(row.direction),
      quote(row.playbookId),
      quote(row.setupGrade),
      quote(row.setupType),
      quote(gradeRationale),
      quote(row.noTradeReason),
      quote(row.gradeDebugReason),
      quote(row.outcomeStatus),
      quote(row.outcomeAt),
      num(row.barsToOutcome),
      quote(row.reason),
      quote(row.entryZone),
      quote(row.stopLoss),
      quote(row.takeProfit),
      num(row.confidence),
      num(row.signalQuality),
      num(row.trendScore),
      num(row.biasScore),
      num(row.orderflowScore),
      num(row.sentimentScore),
      quote(row.eventModifier),
    ].join(",");
    csvLines.push(line);
  }

  const body = csvLines.join("\n");
  const durationMs = Date.now() - startedAt;
  await createAuditRun({
    action: "admin_outcomes_export",
    source: auth.mode,
    ok: true,
    durationMs,
    message: "outcomes_export_success",
    meta: buildAuditMeta({
      auth,
      request: { method: request.method, url: request.url },
      params: { days, assetId, playbookId, format, mode, debug },
      result: { ok: true, rows: rows.length, bytes: body.length },
    }),
  });
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=outcomes-export.csv",
    },
  });
}

function mapRow({ outcome, setup }: OutcomeRow) {
  return {
    evaluatedAt: outcome.evaluatedAt?.toISOString() ?? null,
    snapshotId: outcome.snapshotId,
    setupId: outcome.setupId,
    assetId: outcome.assetId,
    timeframe: outcome.timeframe,
    profile: outcome.profile,
    direction: outcome.direction,
    playbookId: outcome.playbookId ?? null,
    setupGrade: outcome.setupGrade ?? setup?.setupGrade ?? null,
    setupType: outcome.setupType ?? setup?.setupType ?? null,
    gradeRationale: outcome.gradeRationale ?? setup?.gradeRationale ?? null,
    noTradeReason: outcome.noTradeReason ?? setup?.noTradeReason ?? null,
    gradeDebugReason: outcome.gradeDebugReason ?? (setup as { gradeDebugReason?: string })?.gradeDebugReason ?? null,
    outcomeStatus: outcome.outcomeStatus,
    outcomeAt: outcome.outcomeAt?.toISOString() ?? null,
    barsToOutcome: outcome.barsToOutcome ?? null,
    reason: outcome.reason ?? null,
    entryZone: setup?.entryZone ?? null,
    stopLoss: setup?.stopLoss ?? null,
    takeProfit: setup?.takeProfit ?? null,
    confidence: (setup as { confidence?: number })?.confidence ?? null,
    signalQuality: (setup as { signalQuality?: number })?.signalQuality ?? null,
    trendScore: setup?.rings?.trendScore ?? null,
    biasScore: setup?.rings?.biasScore ?? null,
    orderflowScore: setup?.rings?.orderflowScore ?? null,
    sentimentScore: setup?.rings?.sentimentScore ?? null,
    eventModifier: setup?.eventModifier?.classification ?? null,
  };
}

function quote(value: unknown): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function num(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toString() : "";
}
