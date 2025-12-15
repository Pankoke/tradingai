import { describe, it, expect } from "vitest";
import { computeRingsForSetup } from "@/src/lib/engine/rings";

describe("ring meta generation", () => {
  it("respects provided meta overrides and event fallback detection", () => {
    const rings = computeRingsForSetup({
      breakdown: {
        trend: 60,
        momentum: 55,
        volatility: 30,
        pattern: 40,
      },
      biasScore: 55,
      sentimentScore: 52,
      balanceScore: 48,
      orderflowScore: 45,
      ringMeta: {
        trend: { quality: "live", timeframe: "daily", notes: ["fresh"] },
      },
      eventContext: { topEvents: [] },
    });

    expect(rings.meta.trend.quality).toBe("live");
    expect(rings.meta.trend.notes).toContain("fresh");
    expect(rings.meta.event.quality).toBe("fallback");
    expect(rings.meta.event.notes).toContain("no_events");
  });
});
