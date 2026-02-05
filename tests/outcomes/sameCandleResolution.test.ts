import { describe, expect, it } from "vitest";
import { resolveSameCandleHit } from "@/src/server/services/outcomeEvaluator";

const makeCandle = (overrides: Partial<{ open: number; high: number; low: number; close: number }> = {}) => ({
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  ...overrides,
});

describe("resolveSameCandleHit", () => {
  it("LONG gap up above TP => TP first", () => {
    const res = resolveSameCandleHit({
      direction: "Long",
      candle: makeCandle({ open: 120, high: 125, low: 110, close: 122 }),
      tpLevel: 118,
      slLevel: 95,
    });
    expect(res).toBe("hit_tp");
  });

  it("LONG gap down below SL => SL first", () => {
    const res = resolveSameCandleHit({
      direction: "Long",
      candle: makeCandle({ open: 90, high: 105, low: 85, close: 95 }),
      tpLevel: 110,
      slLevel: 92,
    });
    expect(res).toBe("hit_sl");
  });

  it("LONG both hit, bullish body => TP", () => {
    const res = resolveSameCandleHit({
      direction: "Long",
      candle: makeCandle({ open: 100, high: 130, low: 80, close: 120 }),
      tpLevel: 115,
      slLevel: 85,
    });
    expect(res).toBe("hit_tp");
  });

  it("LONG both hit, bearish body => SL", () => {
    const res = resolveSameCandleHit({
      direction: "Long",
      candle: makeCandle({ open: 120, high: 130, low: 80, close: 95 }),
      tpLevel: 125,
      slLevel: 90,
    });
    expect(res).toBe("hit_sl");
  });

  it("SHORT gap up above SL => SL first", () => {
    const res = resolveSameCandleHit({
      direction: "Short",
      candle: makeCandle({ open: 130, high: 140, low: 120, close: 135 }),
      tpLevel: 95,
      slLevel: 125,
    });
    expect(res).toBe("hit_sl");
  });

  it("SHORT gap down below TP => TP first", () => {
    const res = resolveSameCandleHit({
      direction: "Short",
      candle: makeCandle({ open: 90, high: 100, low: 70, close: 85 }),
      tpLevel: 95,
      slLevel: 120,
    });
    expect(res).toBe("hit_tp");
  });

  it("SHORT both hit, bearish body (favour short) => TP", () => {
    const res = resolveSameCandleHit({
      direction: "Short",
      candle: makeCandle({ open: 120, high: 140, low: 80, close: 100 }),
      tpLevel: 95,
      slLevel: 135,
    });
    expect(res).toBe("hit_tp");
  });

  it("SHORT both hit, bullish body => SL", () => {
    const res = resolveSameCandleHit({
      direction: "Short",
      candle: makeCandle({ open: 100, high: 140, low: 80, close: 130 }),
      tpLevel: 90,
      slLevel: 135,
    });
    expect(res).toBe("hit_sl");
  });

  it("doji both hit => ambiguous (null)", () => {
    const res = resolveSameCandleHit({
      direction: "Long",
      candle: makeCandle({ open: 100, high: 130, low: 80, close: 100 }),
      tpLevel: 115,
      slLevel: 85,
    });
    expect(res).toBeNull();
  });
});
