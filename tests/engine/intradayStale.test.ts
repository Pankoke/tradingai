import { describe, expect, it } from "vitest";
import { isIntradayCandleStale } from "@/src/lib/engine/perceptionDataSource";

describe("isIntradayCandleStale", () => {
  const now = new Date("2025-01-01T12:00:00Z");

  it("returns true when candle missing", () => {
    expect(isIntradayCandleStale(null, now, 180)).toBe(true);
  });

  it("flags stale when older than threshold", () => {
    const candle = { timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000) };
    expect(isIntradayCandleStale(candle, now, 180)).toBe(true);
  });

  it("allows fresh candle within threshold", () => {
    const candle = { timestamp: new Date(now.getTime() - 60 * 60 * 1000) };
    expect(isIntradayCandleStale(candle, now, 180)).toBe(false);
  });
});
