import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Setup } from "@/src/lib/engine/types";

const mockListSnapshots = vi.fn();
const mockGetOutcomes = vi.fn();
const mockUpsert = vi.fn();
const mockEvaluate = vi.fn();

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  listSnapshotsPaged: (...args: unknown[]) => mockListSnapshots(...args),
}));

vi.mock("@/src/server/repositories/setupOutcomeRepository", () => ({
  getOutcomesBySetupIds: (...args: unknown[]) => mockGetOutcomes(...args),
  upsertOutcome: (...args: unknown[]) => mockUpsert(...args),
}));

vi.mock("@/src/server/services/outcomeEvaluator", () => ({
  evaluateSwingSetupOutcome: (...args: unknown[]) => mockEvaluate(...args),
}));

describe("runOutcomeEvaluationBatch gold backfill", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("extracts multiple gold setups via asset mapping and upserts outcomes", async () => {
    const setups: Setup[] = [
      {
        id: "gold-1",
        assetId: "GC=F",
        symbol: "GC=F",
        profile: "SWING",
        timeframe: "1D",
        direction: "long",
        biasScore: 80,
        eventScore: 60,
        sentimentScore: 60,
        balanceScore: 50,
        entryZone: { min: 1, max: 2 },
        stopLoss: { min: 0.5, max: 0.6 },
        takeProfit: { min: 3, max: 4 },
      },
      {
        id: "gold-2",
        assetId: "XAUUSD",
        symbol: "XAUUSD",
        profile: "SWING",
        timeframe: "1D",
        direction: "short",
        biasScore: 82,
        eventScore: 55,
        sentimentScore: 55,
        balanceScore: 55,
        entryZone: { min: 10, max: 11 },
        stopLoss: { min: 12, max: 12.5 },
        takeProfit: { min: 8, max: 8.5 },
      },
    ];

    mockListSnapshots
      .mockResolvedValueOnce({ snapshots: [{ id: "snap-1", snapshotTime: new Date(), setups }], total: 1 })
      .mockResolvedValue({ snapshots: [], total: 1 });
    mockGetOutcomes.mockResolvedValue({});
    mockEvaluate.mockResolvedValue({ outcomeStatus: "hit_tp", outcomeAt: new Date(), barsToOutcome: 1, windowBars: 10, reason: null });
    const { runOutcomeEvaluationBatch } = await import("@/src/server/services/outcomeEvaluationRunner");

    const result = await runOutcomeEvaluationBatch({
      daysBack: 730,
      limit: 10,
      assetId: "gold",
      playbookId: "gold-swing-v0.2",
      dryRun: false,
      loggerInfo: false,
    });

    expect(result.stats.eligible).toBe(2);
    expect(result.inserted).toBe(2);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(result.playbookMatchStats.stored + result.playbookMatchStats.resolved).toBeGreaterThan(0);
    expect(result.reasons.asset_mismatch ?? 0).toBe(0);
    expect(result.reasons.playbook_mismatch ?? 0).toBe(0);
  });
});
