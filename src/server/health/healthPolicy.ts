import type { HealthStatus } from "@/src/server/health/healthTypes";

export type HealthPolicy = {
  maxAgeOkSec: number;
  maxAgeDegradedSec: number;
  minCountRecent?: number;
};

export const HEALTH_POLICIES: Record<string, HealthPolicy> = {
  marketdata: { maxAgeOkSec: 60 * 60, maxAgeDegradedSec: 3 * 60 * 60, minCountRecent: 1 },
  derived: { maxAgeOkSec: 4 * 60 * 60, maxAgeDegradedSec: 8 * 60 * 60, minCountRecent: 1 },
  events: { maxAgeOkSec: 24 * 60 * 60, maxAgeDegradedSec: 48 * 60 * 60, minCountRecent: 1 },
  sentiment: { maxAgeOkSec: 24 * 60 * 60, maxAgeDegradedSec: 48 * 60 * 60, minCountRecent: 1 },
};

export function worstStatus(a: HealthStatus, b: HealthStatus): HealthStatus {
  const order: HealthStatus[] = ["ok", "degraded", "error"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}
