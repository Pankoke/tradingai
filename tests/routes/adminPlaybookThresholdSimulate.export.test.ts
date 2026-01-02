import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadThresholdRelaxationSimulation } from "@/src/server/admin/playbookThresholdSimulation";

vi.mock("@/src/server/repositories/setupOutcomeRepository", () => {
  const base = {
    profile: "SWING",
    timeframe: "1D",
    playbookId: "gold-swing-v0.2",
  };
  return {
    listOutcomesForWindow: async () => [
      { ...base, setupId: "s1", snapshotId: "snap1", outcomeStatus: "hit_tp", setupGrade: "A" },
      { ...base, setupId: "s2", snapshotId: "snap1", outcomeStatus: "hit_sl", setupGrade: "B" },
      { ...base, setupId: "s3", snapshotId: "snap1", outcomeStatus: "expired", setupGrade: "NO_TRADE" },
    ],
  };
});

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  getSnapshotById: async () => ({
    id: "snap1",
    setups: [
      { id: "s1", rings: { biasScore: 85, signalQuality: 60, confidenceScore: 70 }, signalQuality: { score: 60 } },
      { id: "s2", rings: { biasScore: 78, signalQuality: 54, confidenceScore: 65 }, signalQuality: { score: 54 } },
      { id: "s3", rings: { biasScore: 72, signalQuality: 52, confidenceScore: 60 }, signalQuality: { score: 52 } },
    ],
  }),
}));

beforeEach(() => {
  process.env.CRON_SECRET = "secret";
});

describe("threshold simulate export route", () => {
  it("returns JSON export matching simulation grid length", async () => {
    const { GET } = await import("@/src/app/api/admin/playbooks/thresholds/simulate/export/route");
    const req = new NextRequest(
      "http://localhost/api/admin/playbooks/thresholds/simulate/export?format=json&days=30&closedOnly=1&includeNoTrade=1&sq=50&conf=60&useConf=1&playbookId=gold-swing-v0.2",
      { headers: { "x-cron-secret": "secret" } },
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    const json = JSON.parse(text);
    expect(Array.isArray(json.grid)).toBe(true);
    expect(json.recommendationV2).toBeDefined();
    const direct = await loadThresholdRelaxationSimulation({
      playbookId: "gold-swing-v0.2",
      days: 30,
      biasCandidates: [80, 78, 75, 72, 70],
      sqCandidates: [50],
      confCandidates: [60],
      includeNoTrade: true,
      closedOnly: true,
      useConf: true,
    });
    expect(json.grid.length).toBe(direct.grid.length);
    expect(json.grid.length).toBeGreaterThan(0);
  });

  it("returns CSV with rows for each grid entry", async () => {
    const { GET } = await import("@/src/app/api/admin/playbooks/thresholds/simulate/export/route");
    const req = new NextRequest(
      "http://localhost/api/admin/playbooks/thresholds/simulate/export?format=csv&days=30&closedOnly=1&includeNoTrade=1&sq=50&conf=60&useConf=1&playbookId=gold-swing-v0.2",
      { headers: { "x-cron-secret": "secret" } },
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.text();
    const lines = body.trim().split("\n");
    // header + one row for each grid item (sq only in this mock)
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toContain("biasMin");
  });
});
