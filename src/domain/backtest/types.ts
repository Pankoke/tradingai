export type OrderSide = "buy" | "sell";

export type EntryPolicy = "next-step-open";

export type OrderIntent = {
  assetId: string;
  side: OrderSide;
  asOfIso: string;
  entryPolicy: EntryPolicy;
  stepIndex: number;
  reason?: string;
};

export type EntryFill = {
  fillIso: string;
  fillPrice: number;
  source: "candle-open-next-step";
};

export type ExecutedEntry =
  | {
      intent: OrderIntent;
      status: "filled";
      fill: EntryFill;
    }
  | {
      intent: OrderIntent;
      status: "unfilled";
      fill?: undefined;
    };

export type PositionSide = "long" | "short";

export type OpenPosition = {
  assetId: string;
  side: PositionSide;
  entryIso: string;
  entryPrice: number;
  entryStepIndex: number;
};

export type ClosedTrade = {
  assetId: string;
  side: PositionSide;
  entry: { iso: string; price: number };
  exit: { iso: string; price: number };
  barsHeld: number;
  reason: "time-exit" | "end-of-range";
};

export type ExecutionCostsConfig = {
  feeBps: number;
  slippageBps: number;
};

export type TradePnl = {
  grossPnl: number;
  fees: number;
  slippage: number;
  netPnl: number;
};

export type CompletedTrade = ClosedTrade & { pnl: TradePnl };

export type BacktestKpis = {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  avgPnl: number;
  maxDrawdown: number;
};
