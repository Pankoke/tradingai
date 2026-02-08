import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { loadGoldThresholdRecommendations } from "@/src/server/admin/playbookThresholdService";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";

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
    "nextUrl" in request && (request as NextRequest).nextUrl
      ? (request as NextRequest).nextUrl.searchParams
      : new URL(request.url).searchParams;
  const days = parseInt(params.get("days") ?? "90", 10);
  const format = (params.get("format") ?? "csv").toLowerCase();

  const data = await loadGoldThresholdRecommendations({ days });

  if (format === "json") {
    await createAuditRun({
      action: "admin_thresholds_export",
      source: auth.mode,
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "thresholds_export_json_success",
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: { days, format },
        result: { ok: true, bytes: JSON.stringify(data).length },
      }),
    });
    return respondOk(data);
  }

  const header = [
    "metric",
    "current",
    "recommended",
    "delta",
    "samples_closed",
    "winrate_A",
    "winrate_B",
    "winrate_NO_TRADE",
  ];
  const lines = [header.join(",")];
  const metrics = ["biasMin", "trendMin", "signalQualityMin", "orderflowMin"] as const;
  for (const metric of metrics) {
    const line = [
      metric,
      numberCell(data.current[metric]),
      numberCell(data.recommended?.[metric]),
      numberCell(data.deltas?.[metric]),
      numberCell(data.samples.closed),
      winrateCell(data.byGrade["A"]?.winRate),
      winrateCell(data.byGrade["B"]?.winRate),
      winrateCell(data.byGrade["NO_TRADE"]?.winRate),
    ].join(",");
    lines.push(line);
  }

  const body = lines.join("\n");
  await createAuditRun({
    action: "admin_thresholds_export",
    source: auth.mode,
    ok: true,
    durationMs: Date.now() - startedAt,
    message: "thresholds_export_csv_success",
    meta: buildAuditMeta({
      auth,
      request: { method: request.method, url: request.url },
      params: { days, format },
      result: { ok: true, rows: lines.length - 1, bytes: body.length },
    }),
  });
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=playbook-thresholds.csv",
    },
  });
}

function numberCell(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function winrateCell(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value * 100)}` : "";
}
