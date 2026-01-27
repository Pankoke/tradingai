import { beforeEach, describe, expect, it, vi } from "vitest";

describe("candle timeframe gating", () => {
  const sample = ["1D", "4H", "1H", "15m"] as const;

  beforeEach(() => {
    vi.resetModules();
  });

  it("filters out unsupported 15m timeframe", async () => {
    const { filterAllowedTimeframes } = await import("@/src/lib/config/candleTimeframes");
    const filtered = filterAllowedTimeframes([...sample]);
    expect(filtered).toEqual(["1D", "4H", "1H"]);
  });
});
