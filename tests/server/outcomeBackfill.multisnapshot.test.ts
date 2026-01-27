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
  getOutcomesBySnapshotAndSetupIds: (...args: unknown[]) => mockGetOutcomes(...args),
  upsertOutcome: (...args: unknown[]) => mockUpsert(...args),
}));

vi.mock("@/src/server/services/outcomeEvaluator", () => ({
  evaluateSwingSetupOutcome: (...args: unknown[]) => mockEvaluate(...args),
}));

describe("outcome backfill with repeated setupId across snapshots", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("writes outcomes for each snapshot/setup pair", async () => {
    const setup: Setup = {
      id: "dup-setup",
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
    };

    mockListSnapshots
      .mockResolvedValueOnce({
        snapshots: [{ id: "snap-1", snapshotTime: new Date("2026-01-10"), setups: [setup] }],
        total: 100,
      })
      .mockResolvedValueOnce({
        snapshots: [{ id: "snap-2", snapshotTime: new Date("2026-01-11"), setups: [setup] }],
        total: 100,
      })
      .mockResolvedValue({ snapshots: [], total: 100 });
    mockGetOutcomes.mockResolvedValue({});
    mockEvaluate.mockResolvedValue({ outcomeStatus: "hit_tp", outcomeAt: new Date(), barsToOutcome: 1, windowBars: 10, reason: null });

    const { runOutcomeEvaluationBatch } = await import("@/src/server/services/outcomeEvaluationRunner");
    const result = await runOutcomeEvaluationBatch({ daysBack: 10, limit: 10, assetId: "gold", dryRun: false });

    expect(result.metrics.evaluated).toBe(2);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });
});
