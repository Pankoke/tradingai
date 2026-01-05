import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListSnapshotsPaged = vi.fn();
const mockGetOutcomesBySetupIds = vi.fn();
const mockGetOutcomesBySnapshotAndSetupIds = vi.fn();
const mockUpsertOutcome = vi.fn();
const mockEvaluate = vi.fn();

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  listSnapshotsPaged: (...args: unknown[]) => mockListSnapshotsPaged(...args),
}));

vi.mock("@/src/server/repositories/setupOutcomeRepository", () => ({
  getOutcomesBySetupIds: (...args: unknown[]) => mockGetOutcomesBySetupIds(...args),
  getOutcomesBySnapshotAndSetupIds: (...args: unknown[]) => mockGetOutcomesBySnapshotAndSetupIds(...args),
  upsertOutcome: (...args: unknown[]) => mockUpsertOutcome(...args),
}));

vi.mock("@/src/server/services/outcomeEvaluator", () => ({
  evaluateSwingSetupOutcome: (...args: unknown[]) => mockEvaluate(...args),
}));

describe("runOutcomeEvaluationBatch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockListSnapshotsPaged.mockResolvedValue({
      snapshots: [
        {
          id: "snap1",
          snapshotTime: new Date("2026-01-05T00:00:00Z"),
          version: "v-env",
          setups: [
            {
              id: "s1",
              assetId: "gold",
              direction: "Long",
              profile: "SWING",
              timeframe: "1D",
              stopLoss: "90",
              takeProfit: "110",
              entryZone: "100 - 105",
              setupGrade: "A",
              setupType: "pullback_continuation",
            },
          ],
        },
      ],
      total: 1,
    });
    mockGetOutcomesBySetupIds.mockResolvedValue({});
    mockGetOutcomesBySnapshotAndSetupIds.mockResolvedValue({});
    mockUpsertOutcome.mockResolvedValue(undefined);
    mockEvaluate.mockResolvedValue({
      outcomeStatus: "hit_tp",
      outcomeAt: new Date("2025-01-02T00:00:00Z"),
      barsToOutcome: 1,
      reason: null,
      windowBars: 10,
      candleCount: 10,
    });
  });

  it("runs evaluation in dry-run mode without writes", async () => {
    const { runOutcomeEvaluationBatch } = await import("@/src/server/services/outcomeEvaluationRunner");
    const result = await runOutcomeEvaluationBatch({ dryRun: true });
    expect(result.metrics.evaluated).toBe(1);
    expect(result.metrics.hit_tp).toBe(1);
    expect(mockUpsertOutcome).not.toHaveBeenCalled();
  });

  it("skips closed outcomes", async () => {
    mockGetOutcomesBySnapshotAndSetupIds.mockResolvedValue({
      "snap1|s1": { outcomeStatus: "hit_tp" },
    });
    const { runOutcomeEvaluationBatch } = await import("@/src/server/services/outcomeEvaluationRunner");
    const result = await runOutcomeEvaluationBatch({ dryRun: false });
    expect(result.metrics.evaluated).toBe(0);
    expect(result.metrics.skippedClosed).toBe(1);
    expect(mockUpsertOutcome).not.toHaveBeenCalled();
  });

  it("persists open evaluations", async () => {
    mockEvaluate.mockResolvedValue({
      outcomeStatus: "open",
      outcomeAt: null,
      barsToOutcome: null,
      reason: "insufficient_candles",
      windowBars: 10,
      candleCount: 1,
    });
    const { runOutcomeEvaluationBatch } = await import("@/src/server/services/outcomeEvaluationRunner");
    const result = await runOutcomeEvaluationBatch({ dryRun: false });
    expect(result.metrics.still_open).toBe(1);
    expect(mockUpsertOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        setupId: "s1",
        outcomeStatus: "open",
      }),
    );
    expect(result.metrics.evaluated).toBe(1);
  });

  it("passes snapshot version into outcome engine version", async () => {
    const { runOutcomeEvaluationBatch } = await import("@/src/server/services/outcomeEvaluationRunner");
    await runOutcomeEvaluationBatch({ dryRun: false });
    expect(mockUpsertOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        setupEngineVersion: "v-env",
      }),
    );
  });
});
