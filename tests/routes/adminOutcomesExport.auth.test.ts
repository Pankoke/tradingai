import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/src/app/api/admin/outcomes/export/route";

vi.mock("@/src/server/admin/outcomeService", () => ({
  loadOutcomeExportRows: vi.fn(async () => []),
}));

describe("admin outcomes export auth", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "test", ADMIN_API_TOKEN: "", CRON_SECRET: "cron123" };
  });

  it("allows CRON_SECRET bearer", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/outcomes/export", {
      headers: { authorization: "Bearer cron123" },
    }));
    expect(res.status).toBe(200);
  });

  it("allows ADMIN_API_TOKEN bearer", async () => {
    process.env.ADMIN_API_TOKEN = "admin123";
    const res = await GET(new NextRequest("http://localhost/api/admin/outcomes/export", {
      headers: { authorization: "Bearer admin123" },
    }));
    expect(res.status).toBe(200);
  });

  it("returns unified unauthorized details when missing credentials", async () => {
    const res = await GET(new NextRequest("http://localhost/api/admin/outcomes/export"));
    expect(res.status).toBe(401);
    const payload = (await res.json()) as {
      ok: boolean;
      error: { code: string; details?: { hasAdmin: boolean; hasCron: boolean; usedAdmin: boolean; usedCron: boolean } };
    };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
    expect(payload.error.details).toEqual({
      hasAdmin: false,
      hasCron: false,
      usedAdmin: false,
      usedCron: false,
    });
  });
});
