import { describe, expect, it } from "vitest";
import { filterSetupsByProfile, isProfileEmpty, parseProfileFilter } from "@/src/lib/setups/profileFilter";

const baseSetups = [
  { timeframe: "1D", profile: "SWING" },
  { timeframe: "1H", profile: "INTRADAY" },
  { timeframe: "1W", profile: "POSITION" },
] as const;

describe("profile filter parsing", () => {
  it("falls back to swing on invalid input", () => {
    expect(parseProfileFilter(undefined)).toBe("swing");
    expect(parseProfileFilter("unknown")).toBe("swing");
  });

  it("parses valid filters", () => {
    expect(parseProfileFilter("intraday")).toBe("intraday");
    expect(parseProfileFilter("position")).toBe("position");
    expect(parseProfileFilter("all")).toBe("all");
  });
});

describe("filterSetupsByProfile", () => {
  it("filters intraday correctly", () => {
    const filtered = filterSetupsByProfile(baseSetups as any, "intraday");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].profile).toBe("INTRADAY");
  });

  it("returns empty when no matching profile", () => {
    const filtered = filterSetupsByProfile(baseSetups as any, "position");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].profile).toBe("POSITION");
  });

  it("detects empty-state when filtered list is empty", () => {
    expect(isProfileEmpty("intraday", 0)).toBe(true);
    expect(isProfileEmpty("all", 0)).toBe(false);
  });
});
