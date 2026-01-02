import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRun = vi.fn();
const mockAudit = vi.fn();

vi.mock("@/src/server/services/outcomeEvaluationRunner", () => ({
  runOutcomeEvaluationBatch: (...args: unknown[]) => mockRun(...args),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: (...args: unknown[]) => mockAudit(...args),
}));

describe("POST /api/cron/outcomes/backfill debug gold eligibility", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mockRun.mockResolvedValue({
      metrics: {
        evaluated: 1,
        hit_tp: 0,
        hit_sl: 0,
        expired: 0,
        ambiguous: 0,
        still_open: 1,
        errors: 0,
        skippedClosed: 0,
      },
      inserted: 0,
      updated: 0,
      unchanged: 0,
      processed: 1,
      reasons: {},
      reasonSamples: {},
      stats: { snapshots: 1, extractedSetups: 2, eligible: 1, skippedClosed: 0 },
      sampleSetupIds: [],
      mismatchedAssets: {},
      mismatchedPlaybooks: {},
      playbookMatchStats: { stored: 0, resolved: 0, incompatible: 0 },
      effectivePlaybookSamples: [],
      goldStats: { extracted: 2, eligible: 1 },
      goldReasonCounts: { missing_levels: 1 },
      goldReasonSamples: { missing_levels: ["gold-miss"] },
      goldSampleIneligible: [
        {
          setupId: "gold-miss",
          snapshotId: "snap1",
          hasEntryZone: false,
          hasStopLoss: false,
          hasTakeProfit: false,
          hasLevels: false,
          hasRiskReward: false,
          hasDirection: false,
        },
      ],
      goldSampleEligible: [
        {
          setupId: "gold-ok",
          snapshotId: "snap2",
          hasEntryZone: true,
          hasStopLoss: true,
          hasTakeProfit: true,
          hasLevels: true,
          hasRiskReward: false,
          hasDirection: true,
        },
      ],
    });
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns goldEligibilityDebug when debug=1", async () => {
    const { POST } = await import("@/src/app/api/cron/outcomes/backfill/route");
    const req = new NextRequest("http://localhost/api/cron/outcomes/backfill?debug=1", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    const debugBlock = body.data.goldEligibilityDebug;
    expect(debugBlock).toBeTruthy();
    expect(typeof debugBlock.extracted).toBe("number");
    expect(Array.isArray(debugBlock.topNotEligibleReasons)).toBe(true);
    expect(debugBlock.topNotEligibleReasons.length).toBeGreaterThan(0);
    expect(typeof debugBlock.reasonSamples).toBe("object");
    expect(Array.isArray(debugBlock.sampleSetups)).toBe(true);
    expect(debugBlock.sampleSetups.length).toBeGreaterThan(0);
  });
});
