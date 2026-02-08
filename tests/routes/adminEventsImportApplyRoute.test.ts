import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/src/app/api/admin/events/import/apply/route";

const mockPreviewEventsImport = vi.fn();
const mockApplyEventsImport = vi.fn();
const mockCreateAuditRun = vi.fn(async () => undefined);

vi.mock("@/src/lib/admin/import/eventsImport", () => ({
  previewEventsImport: (...args: unknown[]) => mockPreviewEventsImport(...args),
  applyEventsImport: (...args: unknown[]) => mockApplyEventsImport(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockCreateAuditRun(...args),
}));

describe("admin events import apply route", () => {
  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = "admin123";
    process.env.CRON_SECRET = "cron123";
    mockPreviewEventsImport.mockResolvedValue({
      summary: { rowsTotal: 1, creates: 1, updates: 0, skips: 0, errors: 0, ignoredColumns: [] },
      rowsPreview: [],
      previewHash: "ehash1",
    });
    mockApplyEventsImport.mockResolvedValue({
      summary: { rowsTotal: 1, creates: 1, updates: 0, skips: 0, errors: 0, ignoredColumns: [] },
    });
  });

  it("applies when hash matches and no errors", async () => {
    const form = new FormData();
    form.set("file", new File(["eventId,title,category,impact,source,scheduledAt\nev1,CPI,macro,3,jb-news,2026-01-01T00:00:00Z"], "events.csv", { type: "text/csv" }));
    form.set("previewHash", "ehash1");
    form.set("confirmApply", "true");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/events/import/apply", {
        method: "POST",
        body: form,
        headers: { authorization: "Bearer admin123" },
      }),
    );
    expect(response.status).toBe(200);
    expect(mockApplyEventsImport).toHaveBeenCalled();
  });

  it("requires confirmApply", async () => {
    const form = new FormData();
    form.set("file", new File(["eventId,title,category,impact,source,scheduledAt\nev1,CPI,macro,3,jb-news,2026-01-01T00:00:00Z"], "events.csv", { type: "text/csv" }));
    form.set("previewHash", "ehash1");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/events/import/apply", {
        method: "POST",
        body: form,
        headers: { authorization: "Bearer admin123" },
      }),
    );
    expect(response.status).toBe(400);
  });
});
