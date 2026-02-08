import { describe, expect, it } from "vitest";
import { buildAuditHref, parseAuditLinkQuery } from "@/src/lib/admin/audit/links";

describe("audit links", () => {
  it("builds locale-aware href with encoded q", () => {
    const href = buildAuditHref("de", {
      kind: "ops",
      status: "failed",
      mode: "cron",
      q: "/api/admin/ops/marketdata",
    });

    expect(href).toBe("/de/admin/audit?mode=cron&status=failed&kind=ops&q=%2Fapi%2Fadmin%2Fops%2Fmarketdata");
  });

  it("parses fallback aliases and sanitizes invalid values", () => {
    const parsed = parseAuditLinkQuery({
      authMode: "admin",
      status: "invalid",
      kind: "ops",
      query: "events",
    });

    expect(parsed).toEqual({
      mode: "admin",
      status: "all",
      kind: "ops",
      q: "events",
    });
  });
});
