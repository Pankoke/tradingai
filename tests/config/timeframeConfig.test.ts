import { describe, expect, it, vi } from "vitest";

describe("timeframeConfig", () => {
  it("includes 1W for non-crypto assets", async () => {
    const { getTimeframesForAsset } = await import("@/src/server/marketData/timeframeConfig");
    const frames = getTimeframesForAsset({ assetClass: "equity" } as any);
    expect(frames).toContain("1W");
    expect(frames).toContain("1D");
  });

  it("gates 15m unless enabled", async () => {
    vi.resetModules();
    delete process.env.ENABLE_SCALP_CANDLES;
    const { getTimeframesForAsset } = await import("@/src/server/marketData/timeframeConfig");
    const frames = getTimeframesForAsset({ assetClass: "crypto" } as any);
    expect(frames).not.toContain("15m");
  });
});
