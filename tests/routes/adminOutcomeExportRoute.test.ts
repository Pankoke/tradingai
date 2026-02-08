import { describe, expect, it, vi } from "vitest";
import { GET } from "@/src/app/api/admin/outcomes/export/route";

vi.mock("@/src/server/admin/outcomeService", () => ({
  loadOutcomeExportRows: vi.fn(async () => [
    {
      outcome: {
        id: "o1",
        setupId: "s1",
        snapshotId: "snap1",
        assetId: "gold",
        profile: "SWING",
        timeframe: "1D",
        direction: "Long",
        playbookId: "gold-swing-v0.2",
        setupGrade: "A",
        setupType: "pullback_continuation",
        gradeRationale: ["Bias strong"],
        noTradeReason: null,
        gradeDebugReason: null,
        evaluatedAt: new Date("2025-01-02T00:00:00Z"),
        windowBars: 10,
        outcomeStatus: "hit_tp",
        outcomeAt: new Date("2025-01-05T00:00:00Z"),
        barsToOutcome: 3,
        reason: null,
      },
      setup: {
        id: "s1",
        assetId: "gold",
        symbol: "XAUUSD",
        timeframe: "1D",
        profile: "SWING",
        direction: "Long",
        confidence: 80,
        eventScore: 50,
        biasScore: 85,
        sentimentScore: 60,
        balanceScore: 0,
        entryZone: "100-110",
        stopLoss: "90",
        takeProfit: "130",
        type: "Regelbasiert",
        accessLevel: "free",
        rings: { trendScore: 60, biasScore: 85, orderflowScore: 50, sentimentScore: 60, meta: {} },
      },
    },
  ]),
}));

vi.mock("@/src/server/repositories/auditRunRepository", () => ({
  createAuditRun: vi.fn(async () => undefined),
}));

function buildRequest(url: string) {
  return new Request(new URL(url, "http://localhost"), {
    headers: { authorization: "Bearer cron-secret", "x-cron-secret": "cron-secret" },
  });
}

describe("admin outcomes export route", () => {
  process.env.CRON_SECRET = "cron-secret";

  it("returns json when format=json", async () => {
    const res = await GET(buildRequest("http://localhost/api/admin/outcomes/export?format=json"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].outcomeStatus).toBe("hit_tp");
  });

  it("returns csv by default", async () => {
    const res = await GET(buildRequest("http://localhost/api/admin/outcomes/export"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.split("\n").length).toBeGreaterThan(1);
    expect(text).toContain("setupId");
  });

  it("returns countsByPlaybookId in debug json", async () => {
    const res = await GET(buildRequest("http://localhost/api/admin/outcomes/export?format=json&debug=1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.countsByPlaybookId_returned).toBeDefined();
    expect(body.data.countsByPlaybookId_returned["gold-swing-v0.2"]).toBe(1);
    expect(body.data.totalRowsReturned).toBe(1);
    expect(body.data.totalRowsInDb).toBe(1);
  });
});
