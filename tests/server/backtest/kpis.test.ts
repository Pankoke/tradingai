import { describe, expect, it } from "vitest";
import {
  computeBacktestKpis,
  computeEquityCurve,
  computeMaxDrawdown,
  computeTradePnl,
  enrichTradesWithPnl,
} from "@/src/server/backtest/kpis";
import type { ClosedTrade, ExecutionCostsConfig } from "@/src/domain/backtest/types";

describe("backtest kpis helpers", () => {
  it("computes trade pnl for long and short with costs", () => {
    const cfg: ExecutionCostsConfig = { feeBps: 10, slippageBps: 20 }; // 0.1% fee, 0.2% slippage
    const longTrade: ClosedTrade = {
      assetId: "A",
      side: "long",
      entry: { iso: "t0", price: 100 },
      exit: { iso: "t1", price: 110 },
      barsHeld: 1,
      reason: "time-exit",
    };
    const shortTrade: ClosedTrade = {
      assetId: "A",
      side: "short",
      entry: { iso: "t0", price: 120 },
      exit: { iso: "t1", price: 110 },
      barsHeld: 1,
      reason: "time-exit",
    };
    const lp = computeTradePnl(longTrade, cfg);
    const sp = computeTradePnl(shortTrade, cfg);
    expect(lp.grossPnl).toBeCloseTo(10);
    expect(sp.grossPnl).toBeCloseTo(10);
    expect(lp.netPnl).toBeCloseTo(10 - (100 + 110) * 0.001 - (100 + 110) * 0.002);
    expect(sp.netPnl).toBeCloseTo(10 - (120 + 110) * 0.001 - (120 + 110) * 0.002);
  });

  it("computes equity curve and max drawdown", () => {
    const curve = computeEquityCurve([10, -5, -10, 20]);
    expect(curve).toEqual([10, 5, -5, 15]);
    expect(computeMaxDrawdown(curve)).toBe(15);
  });

  it("computes kpis from completed trades", () => {
    const trades: ClosedTrade[] = [
      { assetId: "A", side: "long", entry: { iso: "t0", price: 100 }, exit: { iso: "t1", price: 110 }, barsHeld: 1, reason: "time-exit" },
      { assetId: "A", side: "long", entry: { iso: "t2", price: 110 }, exit: { iso: "t3", price: 100 }, barsHeld: 1, reason: "time-exit" },
    ];
    const completed = enrichTradesWithPnl(trades, { feeBps: 0, slippageBps: 0 });
    const kpis = computeBacktestKpis(completed);
    expect(kpis.trades).toBe(2);
    expect(kpis.wins).toBe(1);
    expect(kpis.losses).toBe(1);
    expect(kpis.winRate).toBeCloseTo(0.5);
    expect(kpis.netPnl).toBeCloseTo(0);
    expect(kpis.maxDrawdown).toBeGreaterThanOrEqual(0);
  });
});
