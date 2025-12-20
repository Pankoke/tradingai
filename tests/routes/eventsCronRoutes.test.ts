import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockIngest = vi.fn();
const mockEnrich = vi.fn();
const mockAudit = vi.fn();
const mockRevalidate = vi.fn();

vi.mock("@/src/server/events/ingest/ingestJbNewsCalendar", () => ({
  ingestJbNewsCalendar: (...args: unknown[]) => mockIngest(...args),
}));

vi.mock("@/src/server/events/enrich/enrichEventsAi", () => ({
  enrichEventsAi: (...args: unknown[]) => mockEnrich(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockAudit(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidate(...args),
}));

describe("POST /api/cron/events/ingest", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns ok when authorized", async () => {
    mockIngest.mockResolvedValue({
      imported: 1,
      updated: 0,
      skipped: 0,
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-01-02T00:00:00.000Z",
      source: "jb-news",
    });
    const { POST } = await import("@/src/app/api/cron/events/ingest/route");
    const req = new NextRequest("http://localhost/api/cron/events/ingest", {
      headers: { authorization: "Bearer cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.imported).toBe(1);
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "events.ingest", ok: true }));
  });

  it("rejects when unauthorized", async () => {
    const { POST } = await import("@/src/app/api/cron/events/ingest/route");
    const req = new NextRequest("http://localhost/api/cron/events/ingest");
    const res = await POST(req);
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/cron/events/enrich", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns ok when authorized", async () => {
    mockEnrich.mockResolvedValue({
      enriched: 2,
      skipped: 1,
      failed: 0,
      totalCandidates: 3,
      limitUsed: 3,
      totalRetries: 0,
      skippedLowValueMacro: 0,
      skippedAlreadyEnriched: 0,
      windowFrom: new Date("2025-01-01T00:00:00.000Z"),
      windowTo: new Date("2025-01-03T00:00:00.000Z"),
    });
    const { POST } = await import("@/src/app/api/cron/events/enrich/route");
    const req = new NextRequest("http://localhost/api/cron/events/enrich", {
      headers: { authorization: "Bearer cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.enriched).toBe(2);
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "events.enrich", ok: true }));
  });

  it("rejects when unauthorized", async () => {
    const { POST } = await import("@/src/app/api/cron/events/enrich/route");
    const req = new NextRequest("http://localhost/api/cron/events/enrich");
    const res = await POST(req);
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });
});
