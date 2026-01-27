import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockSimulate = vi.fn();

vi.mock("@/src/server/admin/playbookThresholdSimulation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/server/admin/playbookThresholdSimulation")>();
  return {
    ...actual,
    loadThresholdRelaxationSimulation: (...args: unknown[]) => mockSimulate(...args),
  };
});

describe("admin playbook thresholds simulate auth", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("allows Bearer CRON_SECRET", async () => {
    mockSimulate.mockResolvedValue({ meta: { ok: true }, baseline: { count: 0, closedCounts: { hit_tp: 0, hit_sl: 0, expired: 0, ambiguous: 0, open: 0 } }, grid: [] });
    const { GET } = await import("@/src/app/api/admin/playbooks/thresholds/simulate/route");
    const req = new NextRequest("http://localhost/api/admin/playbooks/thresholds/simulate?bias=80", {
      method: "GET",
      headers: { authorization: "Bearer cron-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("allows x-cron-secret header", async () => {
    mockSimulate.mockResolvedValue({ meta: { ok: true }, baseline: { count: 0, closedCounts: { hit_tp: 0, hit_sl: 0, expired: 0, ambiguous: 0, open: 0 } }, grid: [] });
    const { GET } = await import("@/src/app/api/admin/playbooks/thresholds/simulate/route");
    const req = new NextRequest("http://localhost/api/admin/playbooks/thresholds/simulate?bias=80", {
      method: "GET",
      headers: { "x-cron-secret": "cron-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
