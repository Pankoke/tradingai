import { NextRequest } from "next/server";
import {
  loadThresholdRelaxationSimulation,
  parseSimulationParamsFromSearchParams,
} from "@/src/server/admin/playbookThresholdSimulation";
import { recommendThresholdV2 } from "@/src/lib/admin/thresholdSimulate";
import { respondFail } from "@/src/server/http/apiResponse";

function authCheck(request: Request): { ok: boolean; meta: Record<string, unknown> } {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const cronToken = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const bearer = header?.replace("Bearer", "").trim();
  const cookies = request.headers.get("cookie") ?? "";
  const clerkStatus = request.headers.get("x-clerk-auth-status");
  const alt = request.headers.get("x-cron-secret");
  const env = process.env.NODE_ENV;
  const isLocal = env === "development" || env === "test";
  const usedCron = !!cronToken && (bearer === cronToken || alt === cronToken);
  const sessionCookie =
    cookies.includes("__session=") || cookies.includes("__client_uat=") || cookies.includes("__clerk_session");
  const usedAdmin = !!adminToken && bearer === adminToken;
  const usedSession = !!clerkStatus && clerkStatus !== "signed-out" ? true : sessionCookie;

  if (adminToken) {
    return {
      ok: usedAdmin || usedCron || usedSession,
      meta: { hasAdmin: true, hasCron: !!cronToken, usedAdmin: usedAdmin || usedSession, usedCron },
    };
  }
  if (isLocal && !adminToken) {
    return { ok: true, meta: { localMode: true, hasCron: !!cronToken, usedCron, usedAdmin: usedSession || usedAdmin } };
  }
  return { ok: usedCron || usedSession, meta: { hasAdmin: false, hasCron: !!cronToken, usedCron, usedAdmin: usedSession } };
}

export async function GET(request: NextRequest | Request): Promise<Response> {
  const auth = authCheck(request);
  if (!auth.ok) {
    const env = process.env.NODE_ENV;
    const details = env === "development" || env === "test" ? auth.meta : undefined;
    return respondFail("UNAUTHORIZED", "Unauthorized", 401, details);
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
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
