import { describe, expect, it } from "vitest";
import { toDisplayTitle } from "@/src/server/events/eventDisplay";

describe("toDisplayTitle", () => {
  it("replaces y/y with YoY", () => {
    expect(toDisplayTitle("CPI y/y")).toBe("CPI YoY");
  });

  it("replaces yoy variants with YoY", () => {
    expect(toDisplayTitle("Core CPI YoY")).toBe("Core CPI YoY");
    expect(toDisplayTitle("PPI yoy")).toBe("PPI YoY");
  });

  it("replaces m/m and mom variants with MoM", () => {
    expect(toDisplayTitle("Retail Sales m/m")).toBe("Retail Sales MoM");
    expect(toDisplayTitle("IP MOM")).toBe("IP MoM");
  });

  it("trims and normalizes whitespace", () => {
    expect(toDisplayTitle("  CPI   y/y  ")).toBe("CPI YoY");
  });

  it("returns empty string when title missing", () => {
    expect(toDisplayTitle("")).toBe("");
  });
});
