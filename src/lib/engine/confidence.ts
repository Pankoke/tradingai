import { clamp } from "@/src/lib/math";
import type { MarketMetrics } from "@/src/lib/engine/marketMetrics";

/**
 * Calculates the baseline confidence score derived purely from market metrics.
 * This helper is shared between the live data source and dev utilities so that
 * sentiment adjustments always start from the same baseline.
 */
export function deriveBaseConfidenceScore(metrics: MarketMetrics): number {
  let value = 65 + (metrics.trendScore - 50) * 0.3 + (metrics.momentumScore - 50) * 0.2;
  value -= Math.abs(metrics.priceDriftPct) * 0.5;
  if (metrics.isStale) value -= 20;
  if (metrics.volatilityScore > 70) value -= 5;
  return clamp(Math.round(value), 0, 100);
}
