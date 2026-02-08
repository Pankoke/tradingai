import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/src/app/api/admin/events/export/route";

const mockGetAllEvents = vi.fn();
const mockCreateAuditRun = vi.fn(async () => undefined);

vi.mock("@/src/server/repositories/eventRepository", () => ({
  getAllEvents: (...args: unknown[]) => mockGetAllEvents(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockCreateAuditRun(...args),
}));

describe("admin events export route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "test", ADMIN_API_TOKEN: "admin123", CRON_SECRET: "cron123" };
    mockCreateAuditRun.mockClear();
    mockGetAllEvents.mockResolvedValue([
      {
        id: "ev1",
        providerId: "cpi-us",
        title: "US CPI",
        description: "Inflation release",
        category: "macro",
        impact: 3,
        country: "US",
        summary: null,
        marketScope: null,
        expectationLabel: null,
        expectationConfidence: null,
        expectationNote: null,
        enrichedAt: null,
        scheduledAt: new Date("2026-01-03T12:30:00.000Z"),
        actualValue: null,
        previousValue: null,
        forecastValue: null,
        affectedAssets: null,
        source: "jb-news",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);
  });

  it("returns csv for admin auth", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/events/export", {
        headers: { authorization: "Bearer admin123" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("filename=\"events-");
    const body = await response.text();
    expect(body).toContain("eventId,providerId,title,category,impact,country,source,scheduledAt,createdAt,updatedAt");
    expect(body).toContain("ev1,cpi-us,US CPI");

    const [auditCall] = mockCreateAuditRun.mock.calls;
    const auditPayload = auditCall?.[0] as { meta?: Record<string, unknown> };
    const metaResult = auditPayload.meta?.result as { rows?: number; bytes?: number; ok?: boolean } | undefined;
    expect(auditPayload.meta?.authMode).toBe("admin");
    expect(metaResult?.ok).toBe(true);
    expect(metaResult?.rows).toBe(1);
    expect(metaResult?.bytes).toBe(Buffer.byteLength(body, "utf8"));
  });

  it("returns unauthorized payload when no admin auth", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/events/export"));
    expect(response.status).toBe(401);

    const payload = (await response.json()) as {
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
