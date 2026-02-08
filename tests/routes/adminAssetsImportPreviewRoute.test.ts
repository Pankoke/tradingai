import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/src/app/api/admin/assets/import/preview/route";

const mockPreviewAssetsImport = vi.fn();
const mockCreateAuditRun = vi.fn(async () => undefined);

vi.mock("@/src/lib/admin/import/assetsImport", () => ({
  previewAssetsImport: (...args: unknown[]) => mockPreviewAssetsImport(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockCreateAuditRun(...args),
}));

function buildRequest(url: string, fileContent = "symbol,name,assetClass\nBTCUSDT,Bitcoin,crypto\n") {
  const form = new FormData();
  form.set("file", new File([fileContent], "assets.csv", { type: "text/csv" }));
  return new NextRequest(url, {
    method: "POST",
    body: form,
    headers: { authorization: "Bearer admin123" },
  });
}

describe("admin assets import preview route", () => {
  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = "admin123";
    process.env.CRON_SECRET = "cron123";
    mockCreateAuditRun.mockClear();
    mockPreviewAssetsImport.mockResolvedValue({
      summary: { rowsTotal: 1, creates: 1, updates: 0, skips: 0, errors: 0, ignoredColumns: [] },
      rowsPreview: [{ rowIndex: 2, key: "BTCUSDT", status: "create" }],
      previewHash: "hash1",
    });
  });

  it("returns preview summary and writes audit meta", async () => {
    const response = await POST(buildRequest("http://localhost/api/admin/assets/import/preview"));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; data: { previewHash: string } };
    expect(payload.ok).toBe(true);
    expect(payload.data.previewHash).toBe("hash1");
    const [call] = mockCreateAuditRun.mock.calls;
    const meta = call?.[0]?.meta as { authMode?: string; result?: { rows?: number } };
    expect(meta.authMode).toBe("admin");
    expect(meta.result?.rows).toBe(1);
  });

  it("requires admin auth", async () => {
    const form = new FormData();
    form.set("file", new File(["a,b\n1,2\n"], "assets.csv", { type: "text/csv" }));
    const response = await POST(new NextRequest("http://localhost/api/admin/assets/import/preview", { method: "POST", body: form }));
    expect(response.status).toBe(401);
  });
});
