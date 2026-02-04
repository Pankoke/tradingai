import type {
  BacktestKpis,
  ClosedTrade,
  CompletedTrade,
  ExecutionCostsConfig,
  TradePnl,
} from "@/src/domain/backtest/types";

const DEFAULT_COSTS: ExecutionCostsConfig = { feeBps: 0, slippageBps: 0 };

function applyCosts(price: number, cfg: ExecutionCostsConfig): { fee: number; slippage: number } {
  const fee = price * (cfg.feeBps / 10000);
  const slippage = price * (cfg.slippageBps / 10000);
  return { fee, slippage };
}

export function computeTradePnl(trade: ClosedTrade, cfg: ExecutionCostsConfig = DEFAULT_COSTS): TradePnl {
  const isLong = trade.side === "long";
  const gross = isLong ? trade.exit.price - trade.entry.price : trade.entry.price - trade.exit.price;
  const entryCosts = applyCosts(trade.entry.price, cfg);
  const exitCosts = applyCosts(trade.exit.price, cfg);
  const fees = entryCosts.fee + exitCosts.fee;
  const slippage = entryCosts.slippage + exitCosts.slippage;
  const net = gross - fees - slippage;
  return { grossPnl: gross, fees, slippage, netPnl: net };
}

export function computeEquityCurve(netPnls: number[]): number[] {
  const curve: number[] = [];
  let acc = 0;
  for (const v of netPnls) {
    acc += v;
    curve.push(acc);
  }
  return curve;
}

export function computeMaxDrawdown(equityCurve: number[]): number {
  let peak = 0;
  let maxDd = 0;
  for (const value of equityCurve) {
    if (value > peak) peak = value;
    const dd = peak - value;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

export function enrichTradesWithPnl(
  trades: ClosedTrade[],
  cfg: ExecutionCostsConfig = DEFAULT_COSTS,
): CompletedTrade[] {
  return trades.map((trade) => ({ ...trade, pnl: computeTradePnl(trade, cfg) }));
}

export function computeBacktestKpis(trades: CompletedTrade[]): BacktestKpis {
  const netPnls = trades.map((t) => t.pnl.netPnl);
  const equity = computeEquityCurve(netPnls);
  const maxDrawdown = computeMaxDrawdown(equity);
  const netPnl = netPnls.reduce((a, b) => a + b, 0);
  const wins = trades.filter((t) => t.pnl.netPnl > 0).length;
  const losses = trades.filter((t) => t.pnl.netPnl < 0).length;
  const count = trades.length;
  const avgPnl = count ? netPnl / count : 0;
  const winRate = count ? wins / count : 0;
  return {
    trades: count,
    wins,
    losses,
    winRate,
    netPnl,
    avgPnl,
    maxDrawdown,
  };
}

export const defaultCostsConfig = DEFAULT_COSTS;
