import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mockSetups } from "@/src/lib/mockSetups";
import type { PerceptionSnapshot } from "@/src/lib/engine/types";

const engineSnapshot: PerceptionSnapshot = {
  generatedAt: new Date().toISOString(),
  universe: ["vitest"],
  setupOfTheDayId: mockSetups[0]?.id ?? "setup-1",
  version: "vitest",
  setups: mockSetups.slice(0, 1),
};

vi.mock("@/src/lib/engine/perceptionEngine", () => ({
  buildPerceptionSnapshot: vi.fn(async () => engineSnapshot),
}));

vi.mock("@/src/server/perception/snapshotBuildService", () => {
  class MockLockError extends Error {}
  return {
    requestSnapshotBuild: vi.fn(),
    SnapshotBuildInProgressError: MockLockError,
  };
});

describe("GET /api/perception/today (mock mode)", () => {
  const originalMode = process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE = "mock";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE = originalMode;
    vi.clearAllMocks();
  });

  it("returns snapshot generated directly from engine", async () => {
    const { GET } = await import("@/src/app/api/perception/today/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        snapshot: { dataMode: string };
        setups: Array<{ id: string }>;
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.snapshot.dataMode).toBe("mock");
    expect(payload.data.setups.length).toBeGreaterThan(0);
  });
});
