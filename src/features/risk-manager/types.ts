export type Direction = "long" | "short";

export type RiskFormState = {
  asset: string;
  accountSize: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  takeProfit: number | null;
  direction: Direction;
  leverage: number;
};

export type RiskCalculationResult = {
  positionSize: number;
  maxLossAmount: number;
  riskPercent: number;
  stopDistance: number;
  leverage: number;
  rrHint: string;
  riskAmount: number;
  rewardAmount?: number;
  riskReward?: number;
};
