import { NextRequest } from "next/server";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { getActiveAssets } from "@/src/server/repositories/assetRepository";
import { getTimeframesForAsset } from "@/src/server/marketData/timeframeConfig";
import { getAllowedIntradayTimeframes } from "@/src/lib/config/candleTimeframes";
import { getLatestCandleForAsset } from "@/src/server/repositories/candleRepository";
import { syncDailyCandlesForAsset } from "@/src/features/marketData/syncDailyCandles";
import { createAuditRun } from "@/src/server/repositories/auditRunRepository";
import type { MarketTimeframe } from "@/src/server/marketData/MarketDataProvider";
import { logger } from "@/src/lib/logger";

const cronLogger = logger.child({ route: "cron-marketdata-intraday-sync" });
const CRON_SECRET = process.env.CRON_SECRET;
const AUTH_HEADER = "authorization";
const ALT_HEADER = "x-cron-secret";
const FRESH_THRESHOLD_MINUTES = 70;
const ASSET_WHITELIST = (process.env.INTRADAY_ASSET_WHITELIST ?? "BTC,ETH,GOLD")
  .split(",")
  .map((v) => v.trim().toUpperCase())
  .filter(Boolean);

type SyncLog = {
  symbol: string;
  timeframes: MarketTimeframe[];
  synced: MarketTimeframe[];
  skippedFresh: MarketTimeframe[];
  details: Partial<
    Record<MarketTimeframe, { provider: string; fetched: number; persisted: number; reason?: string }>
  >;
  errors?: string[];
};

export async function POST(request: NextRequest): Promise<Response> {
  if (!CRON_SECRET) {
    return respondFail("SERVICE_UNAVAILABLE", "Cron secret not configured", 503);
  }
  if (!isAuthorized(request)) {
    return respondFail("UNAUTHORIZED", "Unauthorized", 401);
  }

  const startedAt = Date.now();
  const allowedIntraday = new Set(getAllowedIntradayTimeframes());
  const logs: SyncLog[] = [];
  let assetsConsidered = 0;
  let assetsWithIntraday = 0;
  let timeframesAttempted = 0;
  let timeframesSynced = 0;
  let timeframesSkippedFresh = 0;
  let failures = 0;

  try {
    const assets = await getActiveAssets();
    const now = new Date();

    for (const asset of assets) {
      const upperId = asset.id.toUpperCase();
      const upperSymbol = (asset.symbol ?? "").toUpperCase();
      if (ASSET_WHITELIST.length && !ASSET_WHITELIST.includes(upperId) && !ASSET_WHITELIST.includes(upperSymbol)) {
        continue;
      }
      assetsConsidered += 1;
      const supported = getTimeframesForAsset(asset).filter((tf) => allowedIntraday.has(tf));
      if (!supported.length) {
        continue;
      }

      assetsWithIntraday += 1;
      const log: SyncLog = {
        symbol: asset.symbol,
        timeframes: supported,
        synced: [],
        skippedFresh: [],
        details: {},
      };

      for (const timeframe of supported) {
        timeframesAttempted += 1;
        try {
          const latest = await getLatestCandleForAsset({ assetId: asset.id, timeframe });
          if (isFresh(latest?.timestamp, FRESH_THRESHOLD_MINUTES)) {
            timeframesSkippedFresh += 1;
            log.skippedFresh.push(timeframe);
            log.details[timeframe] = { provider: latest?.source ?? "-", fetched: 0, persisted: 0, reason: "fresh" };
            continue;
          }

          const from = computeFrom(latest?.timestamp, timeframe, now);
          const results = await syncDailyCandlesForAsset({ asset, timeframe, from, to: now });
          const tfResult = results.find((r) => r.timeframe === timeframe);
          const inserted = tfResult?.inserted ?? 0;
          const provider = tfResult?.provider ?? "unknown";
          if (inserted > 0) {
            timeframesSynced += 1;
            log.synced.push(timeframe);
            log.details[timeframe] = { provider, fetched: inserted, persisted: inserted };
          } else {
            log.details[timeframe] = { provider, fetched: 0, persisted: 0, reason: "no_data" };
          }
        } catch (error) {
          failures += 1;
          const message = error instanceof Error ? error.message : "unknown error";
          log.errors = [...(log.errors ?? []), `${timeframe}:${message}`];
          cronLogger.warn("intraday sync failed", { symbol: asset.symbol, timeframe, error: message });
        }
      }

      logs.push(log);
    }

    const durationMs = Date.now() - startedAt;
    const meta = {
      assetsConsidered,
      assetsWithIntraday,
      timeframesAttempted,
      timeframesSynced,
      timeframesSkippedFresh,
      failures,
      durationMs,
      logs: logs.slice(0, 50),
    };

    await createAuditRun({
      action: "marketdata.intraday_sync",
      source: "cron",
      ok: failures === 0,
      durationMs,
      message: failures === 0 ? "cron_marketdata_intraday_success" : "cron_marketdata_intraday_partial",
      error: failures > 0 ? "some timeframes failed" : undefined,
      meta,
    });

    if (failures === timeframesAttempted) {
      return respondFail("INTERNAL_ERROR", "All intraday syncs failed", 500, { meta });
    }
    return respondOk(meta);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const durationMs = Date.now() - startedAt;
    await createAuditRun({
      action: "marketdata.intraday_sync",
      source: "cron",
      ok: false,
      durationMs,
      message: "cron_marketdata_intraday_failed",
      error: message,
    });
    return respondFail("INTERNAL_ERROR", message, 500);
  }
}

function isFresh(timestamp: Date | null | undefined, thresholdMinutes: number): boolean {
  if (!timestamp) return false;
  const ageMinutes = (Date.now() - timestamp.getTime()) / 60000;
  return ageMinutes <= thresholdMinutes;
}

function computeFrom(latest: Date | null | undefined, timeframe: MarketTimeframe, now: Date): Date {
  const minutes = timeframeToMinutes(timeframe);
  if (!latest) {
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() - 7);
    return fallback;
  }
  const from = new Date(latest);
  from.setMinutes(from.getMinutes() - minutes * 3);
  return from;
}

function timeframeToMinutes(timeframe: MarketTimeframe): number {
  if (timeframe === "4H") return 240;
  if (timeframe === "1H") return 60;
  if (timeframe === "15m") return 15;
  return 1440;
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
