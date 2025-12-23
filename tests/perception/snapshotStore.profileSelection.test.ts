import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadLatestSnapshotForProfile } from "@/src/features/perception/cache/snapshotStore";

const mockGetLatest = vi.hoisted(() => vi.fn());

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  getLatestSnapshot: (...args: unknown[]) => mockGetLatest(...args),
}));

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
    mockGetLatest.mockImplementation(({ label }: { label?: string }) => {
      if (label === "intraday") return intradaySnapshot;
      return dailySnapshot;
    });

    const result = await loadLatestSnapshotForProfile("intraday");
    expect(result.snapshot?.snapshot.id).toBe("intraday");
    expect(result.fulfilledLabel).toBe("intraday");
  });

  it("falls back to daily when intraday missing", async () => {
    mockGetLatest.mockImplementation(({ label, excludeLabel }: { label?: string; excludeLabel?: string }) => {
      if (label === "intraday") return undefined;
      if (excludeLabel === "intraday") return dailySnapshot;
      return dailySnapshot;
    });

    const result = await loadLatestSnapshotForProfile("intraday");
    expect(result.snapshot?.snapshot.id).toBe("daily");
    expect(result.fulfilledLabel).not.toBe("intraday");
  });
});
