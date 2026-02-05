import { describe, expect, it, vi } from "vitest";
import type { Asset } from "@/src/server/repositories/assetRepository";

describe("timeframeConfig", () => {
  it("includes 1W for non-crypto assets", async () => {
    const { getTimeframesForAsset } = await import("@/src/server/marketData/timeframeConfig");
    const frames = getTimeframesForAsset({ assetClass: "equity" } as unknown as Asset);
    expect(frames).toContain("1W");
    expect(frames).toContain("1D");
  });

  it("does not include unsupported 15m timeframe", async () => {
    vi.resetModules();
    const { getTimeframesForAsset } = await import("@/src/server/marketData/timeframeConfig");
    const frames = getTimeframesForAsset({ assetClass: "crypto" } as unknown as Asset);
    expect(frames).not.toContain("15m");
  });

  it("swing core timeframes are 1D/1W only and exclude 1H/15m", async () => {
    const { getSwingCoreTimeframes, getSwingRefinementTimeframes, getAllowedTimeframesForProfile } = await import(
      "@/src/server/marketData/timeframeConfig"
    );
    expect(getSwingCoreTimeframes()).toEqual(["1D", "1W"]);
    expect(getSwingCoreTimeframes()).not.toContain("1H");
    expect(getSwingCoreTimeframes()).not.toContain("15m");
    expect(getSwingRefinementTimeframes()).toEqual(["4H"]);
    expect(getAllowedTimeframesForProfile("SWING")).toEqual(["1D", "1W"]);
    expect(getAllowedTimeframesForProfile("SWING", { includeRefinement: true })).toEqual(["1D", "1W", "4H"]);
  });

  it("intraday timeframes remain unchanged", async () => {
    const { getAllowedTimeframesForProfile } = await import("@/src/server/marketData/timeframeConfig");
    expect(getAllowedTimeframesForProfile("INTRADAY")).toEqual(["1H", "4H"]);
  });
});
