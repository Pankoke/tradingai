import { describe, it, expect } from "vitest";
import { classifyTimeframeStatus, deriveProfileCoverage } from "@/src/lib/admin/coverageRules";

describe("coverage rules", () => {
  it("classifies stale vs ok", () => {
    expect(classifyTimeframeStatus("1H", 100)).toBe("ok");
    expect(classifyTimeframeStatus("1H", 200)).toBe("stale");
    expect(classifyTimeframeStatus("1D", null)).toBe("missing");
  });

  it("derives profile coverage", () => {
    const profiles = deriveProfileCoverage({ "1D": "ok", "1W": "missing", "1H": "ok", "4H": "ok" });
    expect(profiles.swing).toBe(true);
    expect(profiles.position).toBe(false);
    expect(profiles.intraday).toBe(true);
  });
});
