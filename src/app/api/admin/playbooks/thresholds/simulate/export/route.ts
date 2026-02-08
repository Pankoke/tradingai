import { NextRequest } from "next/server";
import {
  loadThresholdRelaxationSimulation,
  parseSimulationParamsFromSearchParams,
} from "@/src/server/admin/playbookThresholdSimulation";
import { recommendThresholdV2 } from "@/src/lib/admin/thresholdSimulate";
import { respondFail } from "@/src/server/http/apiResponse";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
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
  const parsed = parseSimulationParamsFromSearchParams(params);
  if (!parsed.simulation.biasCandidates.length) {
    return respondFail("VALIDATION_ERROR", "At least one bias candidate required", 400);
  }
  const format = (params.get("format") ?? "json").toLowerCase();

  const data = await loadThresholdRelaxationSimulation(parsed.simulation);
  if (parsed.simulation.debug || parsed.simulation.profile) {
    console.info(
      "[thresholds/simulate/export]",
      JSON.stringify({
        playbookId: parsed.simulation.playbookId,
        days: parsed.simulation.days,
        closedOnly: parsed.simulation.closedOnly,
        includeNoTrade: parsed.simulation.includeNoTrade,
        useConf: parsed.simulation.useConf,
        limit: parsed.simulation.limit,
        timings: data.meta.timings,
      }),
    );
  }
  const guardrails = {
    minClosedTotal: parsed.guardrails.minClosedTotal ?? 20,
    minHits: parsed.guardrails.minHits ?? 1,
    maxExpiryRate: parsed.guardrails.maxExpiryRate,
    minUtility: parsed.guardrails.minUtility,
  };
  const recommendationV2 = recommendThresholdV2(data.grid, data.baseline.closedCounts, guardrails);

  if (format === "csv") {
    const lines = [
      "biasMin,sqMin,confMin,eligibleCount,hit_tp,hit_sl,expired,open,ambiguous,hitRate,expiryRate,winLoss,utility,closedTotal",
    ];
    for (const row of data.grid) {
      lines.push(
        [
          row.biasMin,
          row.sqMin ?? "",
          row.confMin ?? "",
          row.eligibleCount,
          row.closedCounts.hit_tp,
          row.closedCounts.hit_sl,
          row.closedCounts.expired,
          row.closedCounts.open,
          row.closedCounts.ambiguous,
          row.kpis.hitRate.toFixed(4),
          row.kpis.expiryRate.toFixed(4),
          row.kpis.winLoss.toFixed(4),
          row.kpis.utilityScore.toFixed(2),
          row.kpis.closedTotal,
        ].join(","),
      );
    }
    const body = lines.join("\n");
    const mode = [
      parsed.simulation.closedOnly ? "closed" : "all",
      parsed.simulation.includeNoTrade ? "withNoTrade" : "tradeable",
      parsed.simulation.useConf ? "sq-conf" : "sq",
    ].join("-");
    const filename = `threshold-simulate_${parsed.simulation.playbookId ?? "playbook"}_${
      parsed.simulation.days ?? "na"
    }d_${mode}_${Date.now()}.csv`;
    await createAuditRun({
      action: "admin_thresholds_simulate_export",
      source: auth.mode,
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "thresholds_simulate_export_csv_success",
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: parsed.simulation,
        result: { ok: true, rows: data.grid.length, bytes: body.length },
      }),
    });
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const mode = [
    parsed.simulation.closedOnly ? "closed" : "all",
    parsed.simulation.includeNoTrade ? "withNoTrade" : "tradeable",
    parsed.simulation.useConf ? "sq-conf" : "sq",
  ].join("-");
  const filename = `threshold-simulate_${parsed.simulation.playbookId ?? "playbook"}_${
    parsed.simulation.days ?? "na"
  }d_${mode}_${Date.now()}.json`;
  const payload = { ...data, recommendationV2 };
  await createAuditRun({
    action: "admin_thresholds_simulate_export",
    source: auth.mode,
    ok: true,
    durationMs: Date.now() - startedAt,
    message: "thresholds_simulate_export_json_success",
    meta: buildAuditMeta({
      auth,
      request: { method: request.method, url: request.url },
      params: parsed.simulation,
      result: { ok: true, rows: data.grid.length, bytes: JSON.stringify(payload).length },
    }),
  });
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
