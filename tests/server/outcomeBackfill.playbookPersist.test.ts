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

describe("outcome backfill persists effective playbook id", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("stores resolved playbookId when none stored on setup", async () => {
    const snapshotTime = new Date("2026-02-01T00:00:00Z");
    const setup: Setup = {
      id: "gold-setup",
      assetId: "GC=F",
      symbol: "GC=F",
      profile: "SWING",
      timeframe: "1D",
      direction: "long",
      biasScore: 85,
      eventScore: 60,
      sentimentScore: 60,
      balanceScore: 55,
      entryZone: { min: 1, max: 2 },
      stopLoss: { min: 0.5, max: 0.6 },
      takeProfit: { min: 3, max: 4 },
    };

    mockListSnapshots
      .mockResolvedValueOnce({ snapshots: [{ id: "snap-gold", snapshotTime, setups: [setup] }], total: 1 })
      .mockResolvedValue({ snapshots: [], total: 1 });
    mockGetOutcomes.mockResolvedValue({});
    mockEvaluate.mockResolvedValue({ outcomeStatus: "open", outcomeAt: null, barsToOutcome: null, windowBars: 10, reason: null });

    const { runOutcomeEvaluationBatch } = await import("@/src/server/services/outcomeEvaluationRunner");
    await runOutcomeEvaluationBatch({ daysBack: 10, limit: 5, assetId: "gold", dryRun: false });

    expect(mockUpsert).toHaveBeenCalled();
    const payload = mockUpsert.mock.calls[0][0] as { playbookId?: string | null };
    expect(payload.playbookId).toMatch(/^gold-swing-v0/);
  });
});
