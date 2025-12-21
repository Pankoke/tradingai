import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { syncDailyCandlesForAsset } from "@/src/features/marketData/syncDailyCandles";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import { logger } from "@/src/lib/logger";

const cronLogger = logger.child({ route: "cron-marketdata-sync" });
const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";
const DEFAULT_LOOKBACK_DAYS = 5;
const MAX_LOOKBACK_DAYS = 30;

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }

  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const parseResult = parseParams(request);
  if (parseResult.error) {
    return respondFail("VALIDATION_ERROR", parseResult.error, 400);
  }

  const startedAt = Date.now();
  const logs: Array<{ symbol: string; timeframeCount: number; error?: string }> = [];
  let processed = 0;
  let failed = 0;

  try {
    const assets = await getActiveAssets();
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - parseResult.lookbackDays);

    for (const asset of assets) {
      try {
        await syncDailyCandlesForAsset({
          asset,
          from,
          to: now,
        });
        processed += 1;
        logs.push({
          symbol: asset.symbol,
          timeframeCount: asset.assetClass === "crypto" ? 4 : 1,
        });
      } catch (error) {
        failed += 1;
        logs.push({
          symbol: asset.symbol,
          timeframeCount: asset.assetClass === "crypto" ? 4 : 1,
          error: error instanceof Error ? error.message : "unknown error",
        });
        cronLogger.warn("marketdata sync failed for asset", {
          symbol: asset.symbol,
          error: error instanceof Error ? error.message : "unknown error",
        });
      }
    }

    const durationMs = Date.now() - startedAt;
    const result = {
      processed,
      failed,
      lookbackDays: parseResult.lookbackDays,
      logs: logs.slice(0, 50),
      durationMs,
    };

    await createAuditRun({
      action: "marketdata_sync",
      source: "cron",
      ok: failed === 0,
      durationMs,
      message: failed === 0 ? "cron_marketdata_sync_success" : "cron_marketdata_sync_partial",
      error: failed === assets.length ? "all assets failed" : undefined,
      meta: result,
    });

    if (failed === assets.length) {
      return respondFail("INTERNAL_ERROR", "All assets failed to sync", 500, { details: result });
    }

    return respondOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const durationMs = Date.now() - startedAt;
    await createAuditRun({
      action: "marketdata_sync",
      source: "cron",
      ok: false,
      durationMs,
      message: "cron_marketdata_sync_failed",
      error: message,
    });
    return respondFail("INTERNAL_ERROR", message, 500);
  }
}

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get(AUTH_HEADER);
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token === CRON_SECRET) return true;
  }
  const alt = request.headers.get(ALT_HEADER);
  if (alt && alt === CRON_SECRET) {
    return true;
  }
  return false;
}

function parseParams(
  request: NextRequest,
): { lookbackDays: number; error?: string } {
  const params = new URL(request.url).searchParams;
  const lookbackParam = params.get("lookbackDays");
  if (!lookbackParam) {
    return { lookbackDays: DEFAULT_LOOKBACK_DAYS };
  }
  const parsed = Number.parseInt(lookbackParam, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_LOOKBACK_DAYS) {
    return { lookbackDays: DEFAULT_LOOKBACK_DAYS, error: `lookbackDays must be between 1 and ${MAX_LOOKBACK_DAYS}` };
  }
  return { lookbackDays: parsed };
}
