import { clamp } from "@/src/lib/math";
import type { MarketMetrics } from "@/src/lib/engine/marketMetrics";
import type { SetupProfile } from "@/src/lib/config/setupProfile";

/**
 * Calculates the baseline confidence score derived purely from market metrics.
 * This helper is shared between the live data source and dev utilities so that
 * sentiment adjustments always start from the same baseline.
 */
export function deriveBaseConfidenceScore(
  metrics: MarketMetrics,
  options?: { profile?: SetupProfile },
): number {
  const profile = options?.profile ?? "INTRADAY";
  const isSwingProfile = profile === "SWING";

  let value = 65 + (metrics.trendScore - 50) * 0.3 + (metrics.momentumScore - 50) * 0.2;

  const driftPenalty = isSwingProfile
    ? Math.max(0, Math.abs(metrics.priceDriftPct) - 8) * 0.5
    : Math.abs(metrics.priceDriftPct) * 0.5;
  value -= driftPenalty;

  if (metrics.isStale && !isSwingProfile) {
    value -= 20;
  }

  if (metrics.volatilityScore > 70) value -= 5;
  return clamp(Math.round(value), 0, 100);
}
