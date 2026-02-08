import { describe, expect, it } from "vitest";
import { getLastRunByAction } from "@/src/lib/admin/ops/auditMapping";
import type { AuditRowViewModel } from "@/src/lib/admin/audit/viewModel";

function buildRow(overrides: Partial<AuditRowViewModel>): AuditRowViewModel {
  return {
    id: "id",
    action: "snapshot_build",
    source: "admin",
    createdAt: "2026-02-08T00:00:00.000Z",
    durationMs: null,
    message: null,
    error: null,
    gate: null,
    skippedCount: 0,
    meta: null,
    authMode: null,
    actorSource: null,
    actorLabel: null,
    requestMethod: null,
    requestPath: null,
    requestLabel: null,
    resultOk: true,
    rows: null,
    bytes: null,
    kind: "ops",
    ...overrides,
  };
}

describe("ops audit mapping", () => {
  it("picks latest run per action", () => {
    const rows: AuditRowViewModel[] = [
      buildRow({ id: "old", action: "marketdata_sync", createdAt: "2026-02-08T08:00:00.000Z" }),
      buildRow({ id: "new", action: "marketdata_sync", createdAt: "2026-02-08T10:00:00.000Z", authMode: "cron" }),
      buildRow({ id: "bias", action: "bias_sync", createdAt: "2026-02-08T09:00:00.000Z" }),
    ];

    const mapped = getLastRunByAction(rows);
    expect(mapped.marketdataSync?.id).toBe("new");
    expect(mapped.biasSync?.id).toBe("bias");
  });

  it("handles missing matches gracefully", () => {
    const mapped = getLastRunByAction([buildRow({ id: "only", action: "unknown_action" })]);
    expect(mapped.perceptionSnapshot).toBeUndefined();
    expect(mapped.eventsEnrich).toBeUndefined();
  });
});
