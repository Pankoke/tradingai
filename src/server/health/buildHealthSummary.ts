import { getProviderCandleStats, getAssetCandleStats } from "@/src/server/repositories/candleRepository";
import { getEventEnrichmentStats } from "@/src/server/repositories/eventRepository";
import { computeHealthStatus } from "@/src/server/health/computeHealthStatus";
import { HEALTH_POLICIES } from "@/src/server/health/healthPolicy";
import type { HealthCheckResult } from "./healthTypes";

type HealthDeps = {
  getProviderCandleStats: typeof getProviderCandleStats;
  getAssetCandleStats: typeof getAssetCandleStats;
  getEventEnrichmentStats: typeof getEventEnrichmentStats;
};

type BuildParams = {
  now?: Date;
  windowHours?: number;
  deps?: Partial<HealthDeps>;
};

const defaultDeps: HealthDeps = {
  getProviderCandleStats,
  getAssetCandleStats,
  getEventEnrichmentStats,
};

export async function buildHealthSummary(params: BuildParams = {}): Promise<HealthCheckResult[]> {
  const now = params.now ?? new Date();
  const asOfIso = now.toISOString();
  const deps = { ...defaultDeps, ...(params.deps ?? {}) };
  const windowHours = params.windowHours ?? 24;
  const windowLabel = `${windowHours}h`;
  const from = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  const [providerStats, derivedStats, eventStats] = await Promise.all([
    deps.getProviderCandleStats({}),
    deps.getAssetCandleStats({ sources: ["derived"], timeframes: ["4H"] }),
    deps.getEventEnrichmentStats(14),
  ]);

  const marketLatest = providerStats.reduce<Date | null>((latest, row) => {
    const ts = row.lastTimestamp;
    if (!ts) return latest;
    if (!latest || ts > latest) return ts;
    return latest;
  }, null);
  const marketAgeSeconds = marketLatest ? Math.max(0, (now.getTime() - marketLatest.getTime()) / 1000) : null;
  const marketStatus = computeHealthStatus({
    ageSeconds: marketAgeSeconds ?? undefined,
    countRecent: providerStats.reduce((acc, row) => acc + (row.sampleCount ?? 0), 0),
    policy: HEALTH_POLICIES.marketdata,
  });

  const derivedLatest = derivedStats.reduce<Date | null>((latest, row) => {
    const ts = row.lastTimestamp;
    if (!ts) return latest;
    if (!latest || ts > latest) return ts;
    return latest;
  }, null);
  const derivedAgeSeconds = derivedLatest ? Math.max(0, (now.getTime() - derivedLatest.getTime()) / 1000) : null;
  const derivedCountRecent = derivedStats.length;
  const derivedStatus = computeHealthStatus({
    ageSeconds: derivedAgeSeconds ?? undefined,
    countRecent: derivedCountRecent,
    policy: HEALTH_POLICIES.derived,
  });

  const eventStatus = computeHealthStatus({
    ageSeconds: eventStats.lastEnrichedAt
      ? Math.max(0, (now.getTime() - eventStats.lastEnrichedAt.getTime()) / 1000)
      : undefined,
    countRecent: eventStats.total,
    policy: HEALTH_POLICIES.events,
  });

  const results: HealthCheckResult[] = [
    {
      key: "marketdata",
      status: marketStatus,
      asOf: asOfIso,
      durationMs: 0,
      freshness: {
        latestTimestamp: marketLatest?.toISOString(),
        ageSeconds: marketAgeSeconds ?? undefined,
        window: windowLabel,
      },
      counts: {
        providers: providerStats.length,
        samplesRecent: providerStats.reduce((acc, row) => acc + (row.sampleCount ?? 0), 0),
      },
      warnings: marketLatest ? [] : ["marketdata_stale_or_missing"],
      errors: [],
      meta: {
        maxAgeOkSec: HEALTH_POLICIES.marketdata.maxAgeOkSec,
        maxAgeDegradedSec: HEALTH_POLICIES.marketdata.maxAgeDegradedSec,
      },
    },
    {
      key: "derived",
      status: derivedStatus,
      asOf: asOfIso,
      durationMs: 0,
      freshness: {
        latestTimestamp: derivedLatest?.toISOString(),
        ageSeconds: derivedAgeSeconds ?? undefined,
        window: windowLabel,
      },
      counts: {
        assetsWithDerived: derivedCountRecent,
      },
      warnings: derivedLatest ? [] : ["no_recent_derived_candles"],
      errors: [],
      meta: {
        maxAgeOkSec: HEALTH_POLICIES.derived.maxAgeOkSec,
        maxAgeDegradedSec: HEALTH_POLICIES.derived.maxAgeDegradedSec,
      },
    },
    {
      key: "events",
      status: eventStatus,
      asOf: asOfIso,
      durationMs: 0,
      freshness: {
        latestTimestamp: eventStats.lastEnrichedAt?.toISOString(),
        ageSeconds: eventStats.lastEnrichedAt
          ? Math.max(0, (now.getTime() - eventStats.lastEnrichedAt.getTime()) / 1000)
          : undefined,
        window: "14d",
      },
      counts: {
        total: eventStats.total,
        enriched: eventStats.enriched,
        candidates: eventStats.candidates,
      },
      warnings: [],
      errors: [],
      meta: {
        maxAgeOkSec: HEALTH_POLICIES.events.maxAgeOkSec,
        maxAgeDegradedSec: HEALTH_POLICIES.events.maxAgeDegradedSec,
      },
    },
    {
      key: "sentiment",
      status: computeHealthStatus({
        ageSeconds: undefined,
        policy: HEALTH_POLICIES.sentiment,
      }),
      asOf: asOfIso,
      durationMs: 0,
      warnings: ["sentiment_stats_unavailable"],
      errors: [],
      meta: {
        maxAgeOkSec: HEALTH_POLICIES.sentiment.maxAgeOkSec,
        maxAgeDegradedSec: HEALTH_POLICIES.sentiment.maxAgeDegradedSec,
      },
    },
  ];

  return results;
}
