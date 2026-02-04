import { describe, expect, it } from "vitest";
import { buildBacktestRunKey } from "@/src/server/backtest/runKey";

const base = {
  assetId: "BTC",
  fromIso: "2026-01-01T00:00:00.000Z",
  toIso: "2026-01-02T00:00:00.000Z",
  stepHours: 4,
};

describe("buildBacktestRunKey", () => {
  it("is deterministic with sorted keys", () => {
    const k1 = buildBacktestRunKey({ ...base, costsConfig: { feeBps: 1, slippageBps: 2 }, exitPolicy: { kind: "hold", n: 3 } });
    const k2 = buildBacktestRunKey({ ...base, exitPolicy: { n: 3, kind: "hold" }, costsConfig: { slippageBps: 2, feeBps: 1 } });
    expect(k1).toBe(k2);
  });

  it("includes distinguishing params", () => {
    const k1 = buildBacktestRunKey(base);
    const k2 = buildBacktestRunKey({ ...base, stepHours: 1 });
    expect(k1).not.toBe(k2);
  });
});
