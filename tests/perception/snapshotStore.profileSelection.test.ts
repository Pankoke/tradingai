import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSnapshotStore } from "@/src/features/perception/cache/snapshotStore";
import type { PerceptionSnapshotStorePort } from "@/src/domain/perception/ports";

const mockGetLatest = vi.hoisted(() => vi.fn());

const intradaySnapshot = {
  snapshot: { id: "intraday", label: "intraday", snapshotTime: new Date(), setups: [] },
  items: [],
  setups: [],
};

const dailySnapshot = {
  snapshot: { id: "daily", label: null, snapshotTime: new Date(), setups: [] },
  items: [],
  setups: [],
};

describe("loadLatestSnapshotForProfile", () => {
  beforeEach(() => {
    mockGetLatest.mockReset();
  });

  it("returns intraday snapshot when requested", async () => {
    const store = createSnapshotStore(buildPort());
    mockGetLatest.mockImplementation(({ label }: { label?: string }) => {
      if (label === "intraday") return intradaySnapshot;
      return dailySnapshot;
    });

    const result = await store.loadLatestSnapshotForProfile("intraday");
    expect(result.snapshot?.snapshot.id).toBe("intraday");
    expect(result.fulfilledLabel).toBe("intraday");
  });

  it("falls back to daily when intraday missing", async () => {
    const store = createSnapshotStore(buildPort());
    mockGetLatest.mockImplementation(({ label, excludeLabel }: { label?: string; excludeLabel?: string }) => {
      if (label === "intraday") return undefined;
      if (excludeLabel === "intraday") return dailySnapshot;
      return dailySnapshot;
    });

    const result = await store.loadLatestSnapshotForProfile("intraday");
    expect(result.snapshot?.snapshot.id).toBe("daily");
    expect(result.fulfilledLabel).not.toBe("intraday");
  });
});

function buildPort(): PerceptionSnapshotStorePort {
  return {
    insertSnapshotWithItems: async () => {},
    getLatestSnapshot: async (filters) => mockGetLatest(filters ?? {}),
    listRecentSnapshots: async () => [],
    getSnapshotWithItems: async () => null,
    getSnapshotByTime: async () => null,
    deleteSnapshot: async () => {},
  };
}
