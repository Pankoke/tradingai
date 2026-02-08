import { describe, expect, it } from "vitest";
import { parseAssetsExportFilters, parseEventsExportFilters } from "@/src/lib/admin/exports/parseExportFilters";

describe("parseAssetsExportFilters", () => {
  it("trims q and clamps limit with whitelist fallbacks", () => {
    const params = new URLSearchParams({
      q: "  btc  ",
      status: "active",
      class: "crypto",
      limit: "999999",
      sort: "createdAt",
    });

    const parsed = parseAssetsExportFilters(params);
    expect(parsed).toEqual({
      q: "btc",
      status: "active",
      class: "crypto",
      limit: 5000,
      sort: "createdAt",
    });
  });

  it("falls back for invalid values", () => {
    const params = new URLSearchParams({
      status: "invalid",
      limit: "-3",
      sort: "nope",
    });
    const parsed = parseAssetsExportFilters(params);
    expect(parsed.status).toBe("all");
    expect(parsed.limit).toBeUndefined();
    expect(parsed.sort).toBe("symbol");
  });
});

describe("parseEventsExportFilters", () => {
  it("parses from/to and swaps if from is after to", () => {
    const params = new URLSearchParams({
      from: "2026-02-10",
      to: "2026-01-10",
      impact: "high",
      sort: "createdAt",
      q: "  cpi ",
    });
    const parsed = parseEventsExportFilters(params);
    expect(parsed.q).toBe("cpi");
    expect(parsed.impact).toBe("high");
    expect(parsed.sort).toBe("createdAt");
    expect(parsed.from?.toISOString().startsWith("2026-01-10")).toBe(true);
    expect(parsed.to?.toISOString().startsWith("2026-02-10")).toBe(true);
  });

  it("ignores invalid date and impact", () => {
    const params = new URLSearchParams({
      from: "bad-date",
      impact: "critical",
    });
    const parsed = parseEventsExportFilters(params);
    expect(parsed.from).toBeUndefined();
    expect(parsed.impact).toBe("all");
    expect(parsed.sort).toBe("timestamp");
  });
});
