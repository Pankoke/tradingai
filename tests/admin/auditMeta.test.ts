import { describe, expect, it } from "vitest";
import { buildAuditMeta } from "@/src/lib/admin/audit/buildAuditMeta";

describe("buildAuditMeta", () => {
  it("includes auth mode, actor and request context", () => {
    const meta = buildAuditMeta({
      auth: {
        mode: "admin",
        actor: { source: "admin", userId: "u1", email: "a@example.com" },
        details: { hasAdmin: true, hasCron: false, usedAdmin: true, usedCron: false },
      },
      request: { method: "GET", url: "http://localhost/api/admin/outcomes/export?days=30" },
      params: { days: 30, token: "secret" },
      result: { ok: true, rows: 10, bytes: 1000 },
    });

    expect(meta.authMode).toBe("admin");
    expect(meta.actor).toMatchObject({ source: "admin", userId: "u1" });
    expect(meta.request).toMatchObject({ path: "/api/admin/outcomes/export", method: "GET" });
    expect(meta.params).toMatchObject({ days: 30, token: "[redacted]" });
  });
});
