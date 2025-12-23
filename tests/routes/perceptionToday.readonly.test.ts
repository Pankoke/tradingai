import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockLoad = vi.fn();

vi.mock("@/src/features/perception/cache/snapshotStore", () => ({
  loadLatestSnapshotForProfile: (...args: unknown[]) => mockLoad(...args),
}));

describe("GET /api/perception/today (read-only)", () => {
  const originalMode = process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE = "live";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_PERCEPTION_DATA_MODE = originalMode;
  });

  it("returns snapshot from store and does not trigger builds", async () => {
    const now = new Date();
    mockLoad.mockResolvedValue({
      snapshot: {
        snapshot: {
          id: "snap-1",
          snapshotTime: now,
          label: "intraday",
          version: "v1",
          dataMode: "live",
          generatedMs: null,
          notes: null,
          setups: [],
          createdAt: now,
        },
        items: [],
        setups: [],
      },
      fulfilledLabel: "intraday",
      requestedProfile: "intraday",
      requestedAvailable: true,
      fallbackUsed: false,
    });

    const { GET } = await import("@/src/app/api/perception/today/route");
    const req = new NextRequest("http://localhost/api/perception/today?profile=intraday");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.snapshot.label).toBe("intraday");
  });

  it("returns empty payload when no snapshot available, no build", async () => {
    mockLoad.mockResolvedValue({
      snapshot: null,
      fulfilledLabel: null,
      requestedProfile: "intraday",
      requestedAvailable: false,
      fallbackUsed: false,
    });
    const { GET } = await import("@/src/app/api/perception/today/route");
    const req = new NextRequest("http://localhost/api/perception/today?profile=intraday");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.snapshot.id).toBe("missing");
    expect(payload.data.meta.snapshotAvailable).toBe(false);
  });
});
