import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/src/server/repositories/perceptionSnapshotRepository", () => ({
  getLatestSnapshot: vi.fn(),
}));

import { GET } from "@/src/app/api/perception/route";
import { getLatestSnapshot } from "@/src/server/repositories/perceptionSnapshotRepository";

describe("/api/perception route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns hasSnapshot false when nothing exists", async () => {
    (getLatestSnapshot as vi.MockedFunction<typeof getLatestSnapshot>).mockResolvedValue(undefined);
    const res = await GET();
    const payload = await res.json();
    expect(payload).toEqual({ ok: true, data: { hasSnapshot: false } });
  });

  it("returns snapshot summary when available", async () => {
    const mockSnapshot = {
      snapshot: { snapshotTime: new Date("2025-01-01T00:00:00Z"), version: "v1" },
      items: [],
      setups: [],
    } as const;
    (getLatestSnapshot as vi.MockedFunction<typeof getLatestSnapshot>).mockResolvedValue(mockSnapshot);
    const res = await GET();
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data).toEqual({
      hasSnapshot: true,
      latestSnapshotTime: "2025-01-01T00:00:00.000Z",
      version: "v1",
      itemCount: 0,
    });
  });

  it("returns structured error when repository throws", async () => {
    (getLatestSnapshot as vi.MockedFunction<typeof getLatestSnapshot>).mockRejectedValue(new Error("boom"));
    const res = await GET();
    const payload = await res.json();
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "perception.snapshot.fetch_failed",
        message: "Failed to load the latest perception snapshot",
        details: { message: "boom" },
      },
    });
    expect(res.status).toBe(500);
  });
});
