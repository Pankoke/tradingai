import { describe, expect, it, vi } from "vitest";
import { gateCandlesPerAsset } from "@/src/server/health/freshnessGate";

vi.mock("@/src/server/repositories/candleRepository", () => ({
  getAssetCandleStats: vi.fn(async () => [
    { assetId: "A", timeframe: "1H", source: "twelvedata", lastTimestamp: new Date(Date.now() - 60 * 60000) },
    { assetId: "B", timeframe: "1H", source: "twelvedata", lastTimestamp: new Date(Date.now() - 200 * 60000) },
  ]),
}));

describe("freshnessGate", () => {
  it("marks ok vs stale vs missing per asset/timeframe", async () => {
    const result = await gateCandlesPerAsset({
      assetIds: ["A", "B", "C"],
      timeframes: ["1H"],
      thresholdsByTimeframe: { "1H": 180 },
      now: new Date(),
    });

    const assetA = result.perAsset.find((a) => a.assetId === "A");
    const assetB = result.perAsset.find((a) => a.assetId === "B");
    const assetC = result.perAsset.find((a) => a.assetId === "C");

    expect(assetA?.results[0].status).toBe("ok");
    expect(assetB?.results[0].status).toBe("stale");
    expect(assetC?.results[0].status).toBe("missing");
    expect(result.allOk).toBe(false);
    expect(result.staleAssets.some((s) => s.assetId === "B")).toBe(true);
    expect(result.missingAssets.some((s) => s.assetId === "C")).toBe(true);
  });
});
