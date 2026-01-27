import { describe, expect, it } from "vitest";
import { listOutcomesForWindow } from "@/src/server/repositories/setupOutcomeRepository";

vi.mock("@/src/server/db/db", () => {
  const rows = [
    { setup_outcomes: { setupId: "s1", snapshotId: "snap1", evaluatedAt: new Date("2024-01-02"), assetId: "A", profile: "SWING", timeframe: "1D", direction: "long", outcomeStatus: "open" } },
    { setup_outcomes: { setupId: "s1", snapshotId: "snap2", evaluatedAt: new Date("2024-01-03"), assetId: "A", profile: "SWING", timeframe: "1D", direction: "long", outcomeStatus: "open" } },
    { setup_outcomes: { setupId: "s2", snapshotId: "snap3", evaluatedAt: new Date("2024-01-04"), assetId: "A", profile: "SWING", timeframe: "1D", direction: "long", outcomeStatus: "open" } },
  ];
  return {
    db: {
      select: () => ({
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => rows,
              }),
            }),
            orderBy: () => ({
              limit: () => rows,
            }),
          }),
          where: () => ({
            orderBy: () => ({
              limit: () => rows,
            }),
          }),
          orderBy: () => ({
            limit: () => rows,
          }),
        }),
      }),
    },
  };
});

describe("listOutcomesForWindow mode", () => {
  it("returns all rows when mode=all", async () => {
    const res = await listOutcomesForWindow({ mode: "all" });
    expect(res.length).toBe(3);
  });

  it("dedupes by setupId when mode=latest", async () => {
    const res = await listOutcomesForWindow({ mode: "latest" });
    expect(res.length).toBe(2);
    expect(res.find((r) => r.setupId === "s1")?.snapshotId).toBe("snap1"); // first seen kept
  });
});
