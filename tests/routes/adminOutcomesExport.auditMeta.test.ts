import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/src/app/api/admin/outcomes/export/route";

const mockCreateAuditRun = vi.fn(async () => undefined);

vi.mock("@/src/server/admin/outcomeService", () => ({
  loadOutcomeExportRows: vi.fn(async () => []),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockCreateAuditRun(...args),
}));

describe("admin outcomes export audit meta", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "test", ADMIN_API_TOKEN: "admin123", CRON_SECRET: "cron123" };
    mockCreateAuditRun.mockClear();
  });

  it("writes authMode=cron for cron-authenticated export", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/outcomes/export", {
        headers: { authorization: "Bearer cron123" },
      }),
    );

    expect(response.status).toBe(200);
    const [call] = mockCreateAuditRun.mock.calls;
    const payload = call?.[0] as { meta?: Record<string, unknown> };
    expect(payload.meta?.authMode).toBe("cron");
    expect((payload.meta?.actor as { source?: string } | undefined)?.source).toBe("cron");
  });

  it("writes authMode=admin for admin-authenticated export", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/outcomes/export", {
        headers: { authorization: "Bearer admin123" },
      }),
    );

    expect(response.status).toBe(200);
    const [call] = mockCreateAuditRun.mock.calls;
    const payload = call?.[0] as { meta?: Record<string, unknown> };
    expect(payload.meta?.authMode).toBe("admin");
    expect((payload.meta?.actor as { source?: string } | undefined)?.source).toBe("admin");
  });
});
