import { describe, expect, it, vi } from "vitest";
import { backfillSentimentSnapshots } from "@/src/server/sentiment/backfillSentimentSnapshots";
import type { BuildSentimentSnapshotResult } from "@/src/server/sentiment/buildSentimentSnapshotV2";
import type { WriteResult } from "@/src/domain/shared/writeResult";

vi.mock("@/src/server/repositories/assetRepository", () => ({
  getAssetById: async (id: string) => ({ id, symbol: "TEST", name: "Test Asset" }),
}));

vi.mock("@/src/server/sentiment/providerResolver", () => ({
  resolveSentimentProvider: () => ({
    fetchSentiment: vi.fn(async () => ({ assetId: "asset-1", timestamp: new Date(), biasScore: 0 })),
  }),
}));

const baseSnapshot = {
  assetId: "asset-1",
  asOfIso: "2025-01-01T00:00:00.000Z",
  window: { fromIso: "2024-12-31T00:00:00.000Z", toIso: "2025-01-01T00:00:00.000Z" },
  sources: [{ sourceId: "primary", weight: 1, updatedAtIso: "2025-01-01T00:00:00.000Z" }],
  components: { polarityScore: 0.1, confidence: 0.5 },
  meta: {},
};

function makeBuildResult(asOfIso: string, polarity: number): BuildSentimentSnapshotResult {
  return {
    snapshot: { ...baseSnapshot, asOfIso, window: { ...baseSnapshot.window, toIso: asOfIso }, components: { polarityScore: polarity, confidence: 0.5 } },
    warnings: [],
    perSource: {},
  };
}

describe("backfillSentimentSnapshots", () => {
  const writeOk: WriteResult = { inserted: 1, updated: 0, upserted: 1 };

  it("processes chunks and aggregates counts", async () => {
    const buildFn = vi.fn(async (_assetId: string, asOf: Date) => makeBuildResult(asOf.toISOString(), 0.2));
    const upsertFn = vi.fn(async () => writeOk);

    const result = await backfillSentimentSnapshots({
      assetId: "asset-1",
      fromIso: "2025-01-01T00:00:00.000Z",
      toIso: "2025-01-01T04:00:00.000Z",
      stepHours: 2,
      buildFn,
      upsertFn,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.processed).toBe(3); // 0h,2h,4h
    expect(result.upserted).toBe(3);
    expect(result.chunks.every((c) => c.ok)).toBe(true);
    expect(buildFn).toHaveBeenCalledTimes(3);
    expect(upsertFn).toHaveBeenCalledTimes(3);
  });

  it("continues on build failure and reports warnings", async () => {
    const buildFn = vi.fn(async (_assetId: string, asOf: Date) => {
      if (asOf.getUTCHours() === 2) throw new Error("fail");
      return makeBuildResult(asOf.toISOString(), 0.1);
    });
    const upsertFn = vi.fn(async () => writeOk);

    const result = await backfillSentimentSnapshots({
      assetId: "asset-1",
      fromIso: "2025-01-01T00:00:00.000Z",
      toIso: "2025-01-01T04:00:00.000Z",
      stepHours: 2,
      buildFn,
      upsertFn,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.processed).toBe(3);
    expect(result.chunks.some((c) => !c.ok)).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("fails when range is invalid", async () => {
    const result = await backfillSentimentSnapshots({
      assetId: "asset-1",
      fromIso: "bad",
      toIso: "2025-01-01T00:00:00.000Z",
    });
    expect(result.ok).toBe(false);
  });
});
