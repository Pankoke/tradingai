import { describe, expect, it } from "vitest";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { PerceptionDataSource } from "@/src/lib/engine/perceptionDataSource";
import { mockSetups } from "@/src/lib/mockSetups";
import { mockEvents } from "@/src/lib/mockEvents";
import { mockBiasSnapshot } from "@/src/lib/mockBias";

const stubDataSource: PerceptionDataSource = {
  async getSetupsForToday() {
    return mockSetups;
  },
  async getEventsForWindow() {
    return mockEvents.map((e) => ({
      ...e,
      startTime: e.startTime,
      endTime: e.endTime,
    }));
  },
  async getBiasSnapshotForAssets(_params: { assets: { assetId?: string | null; symbol: string; timeframe?: string }[]; asOf: Date }) {
    return mockBiasSnapshot;
  },
};

describe("perceptionEngine (ports-based)", () => {
  it("builds snapshot using injected data source (no server imports required)", async () => {
    const asOf = new Date("2024-01-01T00:00:00Z");
    const snapshot = await buildPerceptionSnapshot({
      asOf,
      dataSource: stubDataSource,
    });

    expect(snapshot.setups.length).toBeGreaterThan(0);
    expect(snapshot.version).toBe("0.1.0");
    expect(snapshot.generatedAt).toBe(asOf.toISOString());
  });
});
