import { describe, expect, it, vi } from "vitest";
import { loadCalibrationStats } from "@/src/server/admin/calibrationService";
import type { Setup } from "@/src/lib/engine/types";

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  listSnapshotsPaged: vi.fn(async () => ({
    snapshots: [
      {
        id: "snap1",
        snapshotTime: new Date("2025-01-01T12:00:00Z"),
        setups: [
          {
            id: "s1",
            assetId: "gold",
            symbol: "XAUUSD",
            timeframe: "1D",
            profile: "SWING",
            direction: "Long",
            setupGrade: "A",
            setupType: "pullback_continuation",
            gradeRationale: ["Bias strong"],
            noTradeReason: null,
            rings: { trendScore: 60, biasScore: 85, orderflowScore: 50, sentimentScore: 70 },
            confidence: 80,
            eventModifier: { classification: "awareness_only" },
          } satisfies Partial<Setup>,
          {
            id: "s2",
            assetId: "gold",
            symbol: "XAUUSD",
            timeframe: "1D",
            profile: "SWING",
            direction: "Short",
            setupGrade: "B",
            setupType: "range_bias",
            rings: { trendScore: 50, biasScore: 75, orderflowScore: 55, sentimentScore: null },
            confidence: 70,
            eventModifier: { classification: "none" },
          } satisfies Partial<Setup>,
        ],
      },
    ],
    total: 1,
  })),
}));

describe("calibrationService aggregation", () => {
  it("aggregates grades and scores", async () => {
    const stats = await loadCalibrationStats({ playbook: "gold-swing", profile: "swing", days: 30, assetId: "gold" });
    expect(stats.gradeCounts["A"]).toBe(1);
    expect(stats.gradeCounts["B"]).toBe(1);
    expect(stats.eventModifierCounts["awareness_only"]).toBe(1);
    expect(stats.averages.trendScore).toBeGreaterThan(0);
    expect(stats.missingSentimentShare).toBeGreaterThan(0);
    expect(stats.recent.length).toBe(2);
  });
});
