import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/src/app/api/admin/events/import/preview/route";

const mockPreviewEventsImport = vi.fn();
const mockCreateAuditRun = vi.fn(async () => undefined);

vi.mock("@/src/lib/admin/import/eventsImport", () => ({
  previewEventsImport: (...args: unknown[]) => mockPreviewEventsImport(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockCreateAuditRun(...args),
}));

describe("admin events import preview route", () => {
  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = "admin123";
    process.env.CRON_SECRET = "cron123";
    mockPreviewEventsImport.mockResolvedValue({
      summary: { rowsTotal: 1, creates: 1, updates: 0, skips: 0, errors: 0, ignoredColumns: [] },
      rowsPreview: [{ rowIndex: 2, key: "ev1", status: "create" }],
      previewHash: "ehash1",
    });
  });

  it("returns preview and audit meta", async () => {
    const form = new FormData();
    form.set("file", new File(["eventId,title,category,impact,source,scheduledAt\nev1,CPI,macro,3,jb-news,2026-01-01T00:00:00Z"], "events.csv", { type: "text/csv" }));
    const response = await POST(
      new NextRequest("http://localhost/api/admin/events/import/preview", {
        method: "POST",
        body: form,
        headers: { authorization: "Bearer admin123" },
      }),
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; data: { previewHash: string } };
    expect(payload.ok).toBe(true);
    expect(payload.data.previewHash).toBe("ehash1");
  });
});
