import { describe, expect, it, vi } from "vitest";
import { GET } from "@/src/app/api/admin/playbooks/calibration/export/route";

vi.mock("@/src/server/admin/calibrationService", () => ({
  loadCalibrationStats: vi.fn(async () => ({
    gradeCounts: {},
    gradeByDay: [],
    averages: {},
    medians: {},
    eventModifierCounts: {},
    missingSentimentShare: 0,
    missingOrderflowShare: 0,
    recent: [
      {
        snapshotCreatedAt: "2025-01-01T00:00:00Z",
        snapshotId: "snap1",
        assetId: "gold",
        symbol: "XAUUSD",
        timeframe: "1D",
        profile: "SWING",
        direction: "Long",
        setupGrade: "A",
        setupType: "pullback_continuation",
        gradeRationale: ["Bias strong"],
        noTradeReason: null,
        gradeDebugReason: "gold match",
        rings: { trendScore: 60, biasScore: 85, orderflowScore: 50, sentimentScore: 70 },
        confidence: 80,
        eventModifier: { classification: "none" },
        entryZone: "100-110",
        stopLoss: "95",
        takeProfit: "130",
      },
    ],
  })),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: vi.fn(async () => undefined),
}));

function buildRequest(url: string) {
  return new Request(new URL(url, "http://localhost"), {
    headers: { authorization: "Bearer cron-secret", "x-cron-secret": "cron-secret" },
  });
}

describe("admin playbook calibration export route", () => {
  process.env.CRON_SECRET = "cron-secret";

  it("returns json when format=json", async () => {
    const res = await GET(buildRequest("http://localhost/api/admin/playbooks/calibration/export?format=json"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].setupGrade).toBe("A");
  });

  it("returns csv by default", async () => {
    const res = await GET(buildRequest("http://localhost/api/admin/playbooks/calibration/export"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.split("\n").length).toBeGreaterThan(1);
    expect(text).toContain("snapshotId");
  });
});
