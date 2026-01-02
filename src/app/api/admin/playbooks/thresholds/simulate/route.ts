import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import {
  loadThresholdRelaxationSimulation,
  parseSimulationParamsFromSearchParams,
} from "@/src/server/admin/playbookThresholdSimulation";

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

  try {
    const params =
      "nextUrl" in request && (request as NextRequest).nextUrl
        ? (request as NextRequest).nextUrl.searchParams
        : new URL(request.url).searchParams;
    const parsed = parseSimulationParamsFromSearchParams(params);
    if (!parsed.simulation.biasCandidates.length) {
      return respondFail("VALIDATION_ERROR", "At least one bias candidate required", 400);
    }

    const data = await loadThresholdRelaxationSimulation(parsed.simulation);
    if (parsed.simulation.debug || parsed.simulation.profile) {
      console.info(
        "[thresholds/simulate]",
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
    if (!data) {
      return respondFail("EMPTY_DATA", "No data returned from simulation", 500);
    }
    return respondOk(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    const env = process.env.NODE_ENV;
    const details = env === "development" || env === "test" ? { error: msg, route: "thresholds/simulate" } : undefined;
    return respondFail("INTERNAL_ERROR", "Threshold simulation failed", 500, details);
  }
}
