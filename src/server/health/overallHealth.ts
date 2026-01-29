import type { HealthCheckResult, HealthStatus } from "@/src/server/health/healthTypes";
import { worstStatus } from "@/src/server/health/healthPolicy";

export type OverallHealth = {
  overallStatus: HealthStatus;
  counts: { ok: number; degraded: number; error: number };
  errorKeys: string[];
  degradedKeys: string[];
};

export function computeOverallHealth(results: HealthCheckResult[]): OverallHealth {
  let overall: HealthStatus = "ok";
  const counts = { ok: 0, degraded: 0, error: 0 };
  const errorKeys: string[] = [];
  const degradedKeys: string[] = [];

  for (const result of results) {
    counts[result.status] += 1;
    overall = worstStatus(overall, result.status);
    if (result.status === "error") errorKeys.push(result.key);
    if (result.status === "degraded") degradedKeys.push(result.key);
  }

  return { overallStatus: overall, counts, errorKeys, degradedKeys };
}
