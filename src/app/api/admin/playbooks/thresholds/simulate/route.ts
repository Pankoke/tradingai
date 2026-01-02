import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { loadThresholdRelaxationSimulation } from "@/src/server/admin/playbookThresholdSimulation";

function authCheck(request: Request): { ok: boolean; meta: Record<string, unknown> } {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const cronToken = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const bearer = header?.replace("Bearer", "").trim();
  const alt = request.headers.get("x-cron-secret");
  const env = process.env.NODE_ENV;
  const isLocal = env === "development" || env === "test";
  const usedCron = !!cronToken && (bearer === cronToken || alt === cronToken);
  const usedAdmin = !!adminToken && bearer === adminToken;

  if (adminToken) {
    return { ok: usedAdmin || usedCron, meta: { hasAdmin: true, hasCron: !!cronToken, usedAdmin, usedCron } };
  }
  if (isLocal && !adminToken) {
    return { ok: true, meta: { localMode: true, hasCron: !!cronToken, usedCron, usedAdmin } };
  }
  return { ok: usedCron, meta: { hasAdmin: false, hasCron: !!cronToken, usedCron, usedAdmin } };
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
    const days = Number.parseInt(params.get("days") ?? "730", 10);
    const playbookId = params.get("playbookId") ?? "gold-swing-v0.2";
    const biasCandidates = (params.get("bias") ?? "80,78,75,72,70")
      .split(",")
      .map((v) => Number.parseInt(v.trim(), 10))
      .filter((v) => Number.isFinite(v));
    if (!biasCandidates.length) {
      return respondFail("VALIDATION_ERROR", "At least one bias candidate required", 400);
    }
    const sqCandidatesParam = params.get("sq");
    const sqCandidates = sqCandidatesParam
      ? sqCandidatesParam
          .split(",")
          .map((v) => Number.parseInt(v.trim(), 10))
          .filter((v) => Number.isFinite(v))
      : undefined;
    const debug = params.get("debug") === "1";

    const data = await loadThresholdRelaxationSimulation({
      playbookId,
      days,
      biasCandidates,
      sqCandidates,
      debug,
    });
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
