import { describe, expect, it, vi } from "vitest";
import { GET } from "@/src/app/api/admin/playbooks/thresholds/export/route";

vi.mock("@/src/server/admin/playbookThresholdService", () => ({
  loadGoldThresholdRecommendations: vi.fn(async () => ({
    current: { biasMin: 80, trendMin: 50, signalQualityMin: 55, orderflowMin: 30 },
    recommended: { biasMin: 82, trendMin: 52, signalQualityMin: 57, orderflowMin: 32 },
    deltas: { biasMin: 2, trendMin: 2, signalQualityMin: 2, orderflowMin: 2 },
    samples: { total: 40, closed: 35, hitTp: 20, hitSl: 15, expired: 0, ambiguous: 0, open: 5 },
    byGrade: {
      A: { hit_tp: 10, hit_sl: 5, expired: 0, ambiguous: 0, open: 0, winRate: 0.66 },
      B: { hit_tp: 5, hit_sl: 5, expired: 0, ambiguous: 0, open: 0, winRate: 0.5 },
      NO_TRADE: { hit_tp: 0, hit_sl: 0, expired: 0, ambiguous: 0, open: 0, winRate: null },
    },
    sensitivity: [],
    insufficientData: false,
    notes: [],
  })),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: vi.fn(async () => undefined),
}));

describe("admin playbook thresholds export route", () => {
  process.env.CRON_SECRET = "cron-secret";

  it("returns json", async () => {
    const res = await GET(
      new Request("http://localhost/api/admin/playbooks/thresholds/export?format=json", {
        headers: { authorization: "Bearer cron-secret", "x-cron-secret": "cron-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.current.biasMin).toBe(80);
  });

  it("returns csv by default", async () => {
    const res = await GET(
      new Request("http://localhost/api/admin/playbooks/thresholds/export", {
        headers: { authorization: "Bearer cron-secret", "x-cron-secret": "cron-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("metric,current,recommended");
    expect(text).toContain("biasMin");
  });
});
