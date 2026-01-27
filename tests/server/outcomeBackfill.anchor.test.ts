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

describe("outcome backfill anchor time selection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses snapshotTime as anchor when generatedAt is missing", async () => {
    const snapshotTime = new Date("2026-01-15T00:00:00.000Z");
    const setups: Setup[] = [
      {
        id: "s1",
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
    ];

    mockListSnapshots
      .mockResolvedValueOnce({ snapshots: [{ id: "snap-1", snapshotTime, setups }], total: 1 })
      .mockResolvedValue({ snapshots: [], total: 1 });
    mockGetOutcomes.mockResolvedValue({});
    mockEvaluate.mockResolvedValue({ outcomeStatus: "open", windowBars: 10, outcomeAt: null, barsToOutcome: null, reason: null });

    const { runOutcomeEvaluationBatch } = await import("@/src/server/services/outcomeEvaluationRunner");
    await runOutcomeEvaluationBatch({ daysBack: 30, limit: 5, assetId: "gold", dryRun: false });

    expect(mockEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotTime,
      }),
    );
  });
});
