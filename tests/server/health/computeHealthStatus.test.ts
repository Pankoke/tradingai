import { describe, expect, it } from "vitest";
import { computeHealthStatus } from "@/src/server/health/computeHealthStatus";
import type { HealthPolicy } from "@/src/server/health/healthPolicy";

const policy: HealthPolicy = { maxAgeOkSec: 60, maxAgeDegradedSec: 180, minCountRecent: 1 };

describe("computeHealthStatus", () => {
  it("returns error when errors present", () => {
    const status = computeHealthStatus({ errorsCount: 1, ageSeconds: 10, policy });
    expect(status).toBe("error");
  });

  it("returns ok when age within ok threshold", () => {
    const status = computeHealthStatus({ ageSeconds: 30, policy, warningsCount: 0, countRecent: 2 });
    expect(status).toBe("ok");
  });

  it("returns degraded when age beyond ok but within degraded", () => {
    const status = computeHealthStatus({ ageSeconds: 120, policy, countRecent: 2 });
    expect(status).toBe("degraded");
  });

  it("returns error when age beyond degraded", () => {
    const status = computeHealthStatus({ ageSeconds: 400, policy, countRecent: 2 });
    expect(status).toBe("error");
  });

  it("returns degraded if counts below minimum", () => {
    const status = computeHealthStatus({ ageSeconds: 10, policy, countRecent: 0 });
    expect(status).toBe("degraded");
  });

  it("downgrades to degraded when warnings exist in ok window", () => {
    const status = computeHealthStatus({ ageSeconds: 20, warningsCount: 2, policy, countRecent: 2 });
    expect(status).toBe("degraded");
  });
});
