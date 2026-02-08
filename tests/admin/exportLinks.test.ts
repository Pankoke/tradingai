import { describe, expect, it } from "vitest";
import { buildAssetsExportHref, buildEventsExportHref } from "@/src/lib/admin/exports/buildExportHref";

describe("buildAssetsExportHref", () => {
  it("preserves only whitelisted filters", () => {
    const href = buildAssetsExportHref({
      q: "btc",
      status: "active",
      class: "crypto",
      limit: "200",
      sort: "symbol",
      ignored: "x",
    });
    expect(href).toBe("/api/admin/assets/export?q=btc&status=active&class=crypto&limit=200&sort=symbol");
  });
});

describe("buildEventsExportHref", () => {
  it("preserves event filters and encodes values", () => {
    const href = buildEventsExportHref({
      q: "us cpi",
      impact: "high",
      from: "2026-01-01",
      to: "2026-02-01",
      limit: "300",
      sort: "timestamp",
      unknown: "y",
    });
    expect(href).toBe("/api/admin/events/export?q=us+cpi&impact=high&from=2026-01-01&to=2026-02-01&limit=300&sort=timestamp");
  });
});
