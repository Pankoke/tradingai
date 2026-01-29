import { describe, expect, it } from "vitest";
import { computeOverallHealth } from "@/src/server/health/overallHealth";
import type { HealthCheckResult } from "@/src/server/health/healthTypes";

const make = (key: string, status: "ok" | "degraded" | "error"): HealthCheckResult => ({
  key,
  status,
  asOf: new Date().toISOString(),
  durationMs: 0,
  warnings: [],
  errors: [],
});

describe("computeOverallHealth", () => {
  it("returns worst status and counts", () => {
    const results: HealthCheckResult[] = [make("a", "ok"), make("b", "degraded"), make("c", "error")];
    const overall = computeOverallHealth(results);
    expect(overall.overallStatus).toBe("error");
    expect(overall.counts).toEqual({ ok: 1, degraded: 1, error: 1 });
    expect(overall.errorKeys).toEqual(["c"]);
    expect(overall.degradedKeys).toEqual(["b"]);
  });
});
