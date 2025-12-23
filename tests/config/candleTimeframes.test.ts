import { beforeEach, describe, expect, it, vi } from "vitest";

describe("candle timeframe gating", () => {
  const sample = ["1D", "4H", "1H", "15m"] as const;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.ENABLE_SCALP_CANDLES;
  });

  it("filters out 15m when scalp mode is disabled", async () => {
    const { filterAllowedTimeframes } = await import("@/src/lib/config/candleTimeframes");
    const filtered = filterAllowedTimeframes(sample as any);
    expect(filtered).toEqual(["1D", "4H", "1H"]);
  });

  it("includes 15m when scalp mode is enabled", async () => {
    process.env.ENABLE_SCALP_CANDLES = "1";
    const { filterAllowedTimeframes } = await import("@/src/lib/config/candleTimeframes");
    const filtered = filterAllowedTimeframes(sample as any);
    expect(filtered).toEqual(["1D", "4H", "1H", "15m"]);
  });
});
