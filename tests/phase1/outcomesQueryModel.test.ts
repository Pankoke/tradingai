import { describe, expect, it } from "vitest";
import {
  buildExplorerHrefFromOverviewState,
  buildOverviewHref,
  mergeOverviewParams,
  parseExplorerParams,
  parseOverviewParams,
} from "../../src/app/[locale]/admin/(panel)/outcomes/queryModel";

describe("outcomes query model", () => {
  it("roundtrips overview params", () => {
    const parsed = parseOverviewParams({
      timeframe: "1w",
      label: "eod",
      minClosed: "25",
      includeOpenOnly: "1",
      flag: "mostly-open",
      days: "60",
    });
    const href = buildOverviewHref("en", "/admin/outcomes/overview", parsed);
    expect(href).toContain("timeframe=1w");
    expect(href).toContain("label=eod");
    expect(href).toContain("minClosed=25");
    expect(href).toContain("includeOpenOnly=1");
    expect(href).toContain("flag=mostly-open");
    expect(href).toContain("days=60");
  });

  it("mergeOverviewParams preserves existing fields", () => {
    const current = parseOverviewParams({ timeframe: "1d", label: "morning", minClosed: "20" });
    const merged = mergeOverviewParams(current, { label: "us_open" });
    expect(merged.timeframe).toBe("1d");
    expect(merged.label).toBe("us_open");
    expect(merged.minClosed).toBe(20);
  });

  it("buildExplorerHrefFromOverviewState sets explorer defaults and hints", () => {
    const overview = parseOverviewParams({ timeframe: "1w", label: "eod", minClosed: "30" });
    const href = buildExplorerHrefFromOverviewState("de", overview, {
      playbookId: "gold-swing-v0.2",
      reportDays: 60,
    });
    expect(href).toContain("/de/admin/outcomes?");
    expect(href).toContain("days=60");
    expect(href).toContain("playbookId=gold-swing-v0.2");
    expect(href).toContain("fromOverview=1");
    expect(href).toContain("fromTf=1w");
    expect(href).toContain("fromLabel=eod");
    expect(href).not.toContain("timeframe=");
    expect(href).not.toContain("label=");
    expect(href).not.toContain("includeAllGrades=1");
    expect(href).not.toContain("includeNoTrade=1");
  });

  it("parseExplorerParams defaults", () => {
    const parsed = parseExplorerParams({});
    expect(parsed.days).toBe(30);
    expect(parsed.includeAllGrades).toBe(false);
    expect(parsed.includeNoTrade).toBe(false);
    expect(parsed.showNoTradeType).toBe(false);
  });

  it("parses single flag filter", () => {
    const parsed = parseOverviewParams({ flag: "low-sample" });
    expect(parsed.flag).toBe("low-sample");
  });
});
