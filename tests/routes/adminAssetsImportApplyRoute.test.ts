import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/src/app/api/admin/assets/import/apply/route";

const mockPreviewAssetsImport = vi.fn();
const mockApplyAssetsImport = vi.fn();
const mockCreateAuditRun = vi.fn(async () => undefined);

vi.mock("@/src/lib/admin/import/assetsImport", () => ({
  previewAssetsImport: (...args: unknown[]) => mockPreviewAssetsImport(...args),
  applyAssetsImport: (...args: unknown[]) => mockApplyAssetsImport(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockCreateAuditRun(...args),
}));

function buildRequest(url: string, options?: { previewHash?: string; confirmApply?: boolean }) {
  const form = new FormData();
  form.set("file", new File(["symbol,name,assetClass\nBTCUSDT,Bitcoin,crypto\n"], "assets.csv", { type: "text/csv" }));
  if (options?.previewHash) form.set("previewHash", options.previewHash);
  if (options?.confirmApply) form.set("confirmApply", "true");
  return new NextRequest(url, {
    method: "POST",
    body: form,
    headers: { authorization: "Bearer admin123" },
  });
}

describe("admin assets import apply route", () => {
  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = "admin123";
    process.env.CRON_SECRET = "cron123";
    mockApplyAssetsImport.mockClear();
    mockCreateAuditRun.mockClear();
    mockPreviewAssetsImport.mockResolvedValue({
      summary: { rowsTotal: 1, creates: 1, updates: 0, skips: 0, errors: 0, ignoredColumns: [] },
      rowsPreview: [],
      previewHash: "hash1",
    });
    mockApplyAssetsImport.mockResolvedValue({
      summary: { rowsTotal: 1, creates: 1, updates: 0, skips: 0, errors: 0, ignoredColumns: [] },
    });
  });

  it("applies when preview is clean and hash provided", async () => {
    const response = await POST(buildRequest("http://localhost/api/admin/assets/import/apply", { previewHash: "hash1", confirmApply: true }));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; data: { summary: { rowsTotal: number } } };
    expect(payload.ok).toBe(true);
    expect(payload.data.summary.rowsTotal).toBe(1);
    expect(mockApplyAssetsImport).toHaveBeenCalled();
  });

  it("blocks apply when preview has errors", async () => {
    mockPreviewAssetsImport.mockResolvedValueOnce({
      summary: { rowsTotal: 1, creates: 0, updates: 0, skips: 0, errors: 1, ignoredColumns: [] },
      rowsPreview: [],
      previewHash: "hash1",
    });
    const response = await POST(buildRequest("http://localhost/api/admin/assets/import/apply", { previewHash: "hash1", confirmApply: true }));
    expect(response.status).toBe(400);
    expect(mockApplyAssetsImport).not.toHaveBeenCalled();
  });
});
