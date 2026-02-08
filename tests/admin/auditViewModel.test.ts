import { describe, expect, it } from "vitest";
import { classifyAuditKind, filterAuditRows, mapAuditRunToRow } from "@/src/lib/admin/audit/viewModel";

describe("audit view model", () => {
  it("maps missing meta safely", () => {
    const row = mapAuditRunToRow({
      id: "r1",
      action: "snapshot_build",
      source: "admin",
      ok: true,
      createdAt: "2026-02-08T00:00:00.000Z",
      meta: null,
    });

    expect(row.authMode).toBeNull();
    expect(row.actorLabel).toBeNull();
    expect(row.requestLabel).toBeNull();
    expect(row.rows).toBeNull();
    expect(row.bytes).toBeNull();
    expect(row.resultOk).toBe(true);
  });

  it("filters by auth mode, status, kind and search", () => {
    const rows = [
      mapAuditRunToRow({
        id: "1",
        action: "admin_outcomes_export",
        source: "cron",
        ok: true,
        createdAt: "2026-02-08T00:00:00.000Z",
        meta: {
          authMode: "cron",
          actor: { source: "cron" },
          request: { method: "GET", path: "/api/admin/outcomes/export" },
          result: { ok: true },
        },
      }),
      mapAuditRunToRow({
        id: "2",
        action: "marketdata_sync",
        source: "admin",
        ok: false,
        createdAt: "2026-02-08T00:00:00.000Z",
        meta: {
          authMode: "admin",
          actor: { source: "admin", email: "ops@local" },
          request: { method: "POST", path: "/api/admin/ops/marketdata" },
          result: { ok: false },
        },
      }),
    ];

    const filtered = filterAuditRows(rows, {
      authMode: "admin",
      status: "failed",
      kind: "ops",
      search: "marketdata",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("2");
  });

  it("classifies exports by action suffix", () => {
    expect(classifyAuditKind("admin_outcomes_export")).toBe("exports");
    expect(classifyAuditKind("marketdata_sync")).toBe("ops");
  });
});
