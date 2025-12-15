import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { saveSnapshotToStore, loadLatestSnapshotFromStore, deleteSnapshotFromStore } from "@/src/features/perception/cache/snapshotStore";
import { createAsset, deleteAsset, type Asset } from "@/src/server/repositories/assetRepository";
import type { Setup } from "@/src/lib/engine/types";
import { mockSetups } from "@/src/lib/mockSetups";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeMaybe = hasDatabase ? describe : describe.skip;

describeMaybe("snapshotStore", () => {
  let asset: Asset;

  beforeAll(async () => {
    asset = await createAsset({
      id: `vitest-asset-${randomUUID()}`,
      symbol: `VITEST-${Date.now()}`,
      displaySymbol: "VITEST",
      name: "Vitest Asset",
      assetClass: "crypto",
      baseCurrency: "USD",
      quoteCurrency: "USDT",
      isActive: true,
    });
  });

  afterAll(async () => {
    if (asset) {
      await deleteAsset(asset.id);
    }
  });

  it("persists and returns the latest snapshot", async () => {
    const snapshotId = `vitest-snapshot-${randomUUID()}`;
    const snapshotTime = new Date("2099-01-01T00:00:00Z");
    const setupBase = mockSetups[0];
    const setup: Setup = {
      ...setupBase,
      id: `vitest-setup-${randomUUID()}`,
      assetId: asset.id,
      symbol: asset.symbol,
      snapshotId,
      snapshotCreatedAt: snapshotTime.toISOString(),
    };

    await saveSnapshotToStore({
      snapshot: {
        id: snapshotId,
        snapshotTime,
        label: "vitest",
        version: "test",
        dataMode: "mock",
        generatedMs: 15,
        notes: JSON.stringify({ source: "vitest" }),
        setups: [setup],
        createdAt: snapshotTime,
      },
      items: [
        {
          id: `vitest-item-${randomUUID()}`,
          snapshotId,
          assetId: asset.id,
          setupId: setup.id,
          direction: "long",
          rankOverall: 1,
          rankWithinAsset: 1,
          scoreTotal: 80,
          scoreTrend: 75,
          scoreMomentum: 70,
          scoreVolatility: 10,
          scorePattern: 60,
          confidence: 85,
          biasScore: 65,
          biasScoreAtTime: 65,
          eventContext: null,
          riskReward: null,
          ringAiSummary: null,
          isSetupOfTheDay: true,
          createdAt: snapshotTime,
        },
      ],
    });

    const latest = await loadLatestSnapshotFromStore();
    expect(latest).not.toBeNull();
    expect(latest?.snapshot.id).toBe(snapshotId);
    expect(latest?.items[0]?.setupId).toBe(setup.id);

    await deleteSnapshotFromStore(snapshotId);
  });
});
