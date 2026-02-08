import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import {
  loadThresholdRelaxationSimulation,
  parseSimulationParamsFromSearchParams,
} from "@/src/server/admin/playbookThresholdSimulation";
import { asUnauthorizedResponse, requireAdminOrCron } from "@/src/lib/admin/auth/requireAdminOrCron";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";

export async function GET(request: NextRequest | Request): Promise<Response> {
  const startedAt = Date.now();
  let auth;
  try {
    auth = await requireAdminOrCron(request, { allowCron: true, allowAdminToken: true });
  } catch (error) {
    const unauthorized = asUnauthorizedResponse(error);
    if (unauthorized) return unauthorized;
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
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
    await createAuditRun({
      action: "admin_thresholds_simulate",
      source: auth.mode,
      ok: true,
      durationMs: Date.now() - startedAt,
      message: "admin_thresholds_simulate_success",
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        params: parsed.simulation as unknown as Record<string, unknown>,
        result: { ok: true },
      }),
    });
    return respondOk(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    await createAuditRun({
      action: "admin_thresholds_simulate",
      source: auth.mode,
      ok: false,
      durationMs: Date.now() - startedAt,
      message: "admin_thresholds_simulate_failed",
      error: msg,
      meta: buildAuditMeta({
        auth,
        request: { method: request.method, url: request.url },
        result: { ok: false },
        error: msg,
      }),
    });
    const env = process.env.NODE_ENV;
    const details = env === "development" || env === "test" ? { error: msg, route: "thresholds/simulate" } : undefined;
    return respondFail("INTERNAL_ERROR", "Threshold simulation failed", 500, details);
  }
}
