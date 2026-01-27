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

describe("admin playbook thresholds simulate smoke", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mockSimulate.mockResolvedValue({ meta: { ok: true }, baseline: { count: 1, closedCounts: { hit_tp: 0, hit_sl: 0, expired: 0, ambiguous: 0, open: 1 } }, grid: [] });
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns JSON body on success", async () => {
    const { GET } = await import("@/src/app/api/admin/playbooks/thresholds/simulate/route");
    const req = new NextRequest("http://localhost/api/admin/playbooks/thresholds/simulate?bias=80", {
      method: "GET",
      headers: { authorization: "Bearer cron-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toBeDefined();
  });

  it("returns JSON error on unauthorized", async () => {
    const originalAdmin = process.env.ADMIN_API_TOKEN;
    process.env.ADMIN_API_TOKEN = "admin-token";
    process.env.CRON_SECRET = "other";
    const { GET } = await import("@/src/app/api/admin/playbooks/thresholds/simulate/route");
    const req = new NextRequest("http://localhost/api/admin/playbooks/thresholds/simulate", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    process.env.ADMIN_API_TOKEN = originalAdmin;
  });
});
