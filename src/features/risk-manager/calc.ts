import type { RiskCalculationResult, RiskFormState } from "@/features/risk-manager/types";

export function computeRisk(form: RiskFormState): RiskCalculationResult {
  const stopDistance = Math.abs(form.entry - form.stopLoss);
  const leverage = form.leverage > 0 ? form.leverage : 1;
  const riskAmount = form.accountSize * (form.riskPercent / 100);
  const positionSize = stopDistance > 0 ? (riskAmount / stopDistance) * leverage : 0;
  const rewardDiff =
    form.takeProfit != null ? Math.abs(form.takeProfit - form.entry) : undefined;
  const rewardAmount =
    rewardDiff != null && positionSize > 0 ? rewardDiff * positionSize : undefined;
  const riskReward =
    rewardAmount != null && riskAmount > 0 ? rewardAmount / riskAmount : undefined;
  const rrHint = buildHint(form.riskPercent, stopDistance);

  return {
    positionSize,
    maxLossAmount: riskAmount,
    riskPercent: form.riskPercent,
    stopDistance,
    leverage,
    rrHint,
    riskAmount,
    rewardAmount,
    riskReward,
  };
}

function buildHint(riskPercent: number, stopDistance: number): string {
  if (riskPercent <= 0 || stopDistance <= 0) return "konservativ";
  if (riskPercent <= 1 && stopDistance <= 1) return "konservativ";
  if (riskPercent <= 2 && stopDistance <= 2) return "moderat";
  return "aggressiv";
}
