import type { HealthStatus } from "./healthTypes";
import type { HealthPolicy } from "./healthPolicy";

type Params = {
  ageSeconds?: number | null;
  errorsCount?: number;
  warningsCount?: number;
  countRecent?: number;
  policy: HealthPolicy;
};

export function computeHealthStatus({
  ageSeconds,
  errorsCount = 0,
  warningsCount = 0,
  countRecent,
  policy,
}: Params): HealthStatus {
  if (errorsCount > 0) return "error";

  if (policy.minCountRecent !== undefined && countRecent !== undefined && countRecent < policy.minCountRecent) {
    // Degraded if not enough fresh samples
    return "degraded";
  }

  if (ageSeconds == null || Number.isNaN(ageSeconds)) {
    return "degraded";
  }

  if (ageSeconds <= policy.maxAgeOkSec) {
    return warningsCount > 0 ? "degraded" : "ok";
  }
  if (ageSeconds <= policy.maxAgeDegradedSec) {
    return "degraded";
  }
  return "error";
}
