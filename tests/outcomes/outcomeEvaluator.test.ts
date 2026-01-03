import { describe, expect, it } from "vitest";
import { computeSwingOutcome } from "@/src/server/services/outcomeEvaluator";
import type { Candle } from "@/src/server/repositories/candleRepository";

const baseSetup = {
  id: "s1",
  assetId: "gold",
  direction: "Long" as const,
  profile: "SWING",
  timeframe: "1D",
  stopLoss: "90",
  takeProfit: "110",
  snapshotId: "snap1",
};

function candle(timestamp: string, high: number, low: number): Candle {
  return {
    id: `${timestamp}`,
    assetId: "gold",
    timeframe: "1D",
    timestamp: new Date(timestamp),
    open: low,
    high,
    low,
    close: low,
    volume: 0,
    source: "test",
    createdAt: new Date(timestamp),
  };
}

describe("computeSwingOutcome", () => {
  it("marks hit_tp when target is reached first (long)", () => {
    const result = computeSwingOutcome({
      setup: baseSetup,
      candles: [
        candle("2025-01-02T00:00:00Z", 115, 95),
        candle("2025-01-03T00:00:00Z", 100, 95),
        candle("2025-01-04T00:00:00Z", 100, 95),
      ],
      windowBars: 3,
    });
    expect(result.outcomeStatus).toBe("hit_tp");
    expect(result.barsToOutcome).toBe(1);
  });

  it("marks hit_sl when stop is reached first (long)", () => {
    const result = computeSwingOutcome({
      setup: baseSetup,
      candles: [
        candle("2025-01-02T00:00:00Z", 100, 80),
        candle("2025-01-03T00:00:00Z", 100, 95),
        candle("2025-01-04T00:00:00Z", 100, 95),
      ],
      windowBars: 3,
    });
    expect(result.outcomeStatus).toBe("hit_sl");
  });

  it("marks ambiguous when tp and sl touched in same candle (long)", () => {
    const result = computeSwingOutcome({
      setup: baseSetup,
      candles: [
        candle("2025-01-02T00:00:00Z", 120, 80),
        candle("2025-01-03T00:00:00Z", 100, 95),
        candle("2025-01-04T00:00:00Z", 100, 95),
      ],
      windowBars: 3,
    });
    expect(result.outcomeStatus).toBe("ambiguous");
    expect(result.reason).toBe("tp_and_sl_same_candle");
  });

  it("expires when window elapses without touch", () => {
    const result = computeSwingOutcome({
      setup: baseSetup,
      candles: [
        candle("2025-01-02T00:00:00Z", 100, 95),
        candle("2025-01-03T00:00:00Z", 100, 95),
        candle("2025-01-04T00:00:00Z", 100, 95),
      ],
      windowBars: 3,
    });
    expect(result.outcomeStatus).toBe("expired");
  });

  it("supports short setups for tp/sl detection", () => {
    const shortSetup = { ...baseSetup, direction: "Short" as const, stopLoss: "110", takeProfit: "90" };
    const tpHit = computeSwingOutcome({
      setup: shortSetup,
      candles: [
        candle("2025-01-02T00:00:00Z", 100, 85),
        candle("2025-01-03T00:00:00Z", 100, 95),
        candle("2025-01-04T00:00:00Z", 100, 95),
      ],
      windowBars: 3,
    });
    expect(tpHit.outcomeStatus).toBe("hit_tp");

    const slHit = computeSwingOutcome({
      setup: shortSetup,
      candles: [
        candle("2025-01-02T00:00:00Z", 120, 95),
        candle("2025-01-03T00:00:00Z", 100, 95),
        candle("2025-01-04T00:00:00Z", 100, 95),
      ],
      windowBars: 3,
    });
    expect(slHit.outcomeStatus).toBe("hit_sl");
  });

  it("keeps status open when insufficient candles are available", () => {
    const result = computeSwingOutcome({
      setup: baseSetup,
      candles: [candle("2025-01-02T00:00:00Z", 100, 95)],
      windowBars: 5,
    });
    expect(result.outcomeStatus).toBe("open");
    expect(result.reason).toBe("insufficient_candles");
  });

  it("ignores candles after the configured windowBars", () => {
    const result = computeSwingOutcome({
      setup: baseSetup,
      candles: [
        candle("2025-01-02T00:00:00Z", 100, 95),
        candle("2025-01-03T00:00:00Z", 100, 95),
        candle("2025-01-04T00:00:00Z", 100, 95),
        candle("2025-01-05T00:00:00Z", 120, 90),
      ],
      windowBars: 2,
    });
    expect(result.outcomeStatus).toBe("expired");
    expect(result.barsToOutcome).toBeNull();
  });

  it("skips invalid candle values but continues evaluation", () => {
    const broken: Candle = {
      ...candle("2025-01-02T00:00:00Z", 100, 95),
      high: Number.NaN,
    };
    const result = computeSwingOutcome({
      setup: baseSetup,
      candles: [broken, candle("2025-01-03T00:00:00Z", 115, 100), candle("2025-01-04T00:00:00Z", 100, 95)],
      windowBars: 3,
    });
    expect(result.outcomeStatus).toBe("hit_tp");
    expect(result.barsToOutcome).toBe(2);
  });
});
