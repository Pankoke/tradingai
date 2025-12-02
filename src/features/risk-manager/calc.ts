import type {
  RiskCalculationResult,
  RiskFormState,
  RiskHint,
  RiskHintLevel,
} from "@/src/features/risk-manager/types";

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
  const hints: RiskHint[] = [];
  if (form.direction === "long" && form.stopLoss >= form.entry) {
    pushHint(
      hints,
      "danger",
      "Bei einem Long-Trade sollte der Stop-Loss unter dem Entry liegen.",
    );
  }
  if (form.direction === "short" && form.stopLoss <= form.entry) {
    pushHint(
      hints,
      "danger",
      "Bei einem Short-Trade sollte der Stop-Loss über dem Entry liegen.",
    );
  }
  if (riskReward != null && riskReward < 1.5) {
    pushHint(
      hints,
      "warning",
      "Das Chance-Risiko-Verhältnis ist unter 1.5:1 und damit eher unattraktiv.",
    );
  }
  if (form.riskPercent > 5) {
    pushHint(
      hints,
      "danger",
      "Du riskierst mehr als 5 % deines Kontos – das ist für die meisten Strategien sehr aggressiv.",
    );
  } else if (form.riskPercent > 2) {
    pushHint(
      hints,
      "warning",
      "Du riskierst mehr als 2 % deines Kontos – das ist für viele Strategien relativ aggressiv.",
    );
  }

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
    hints,
  };
}

function buildHint(riskPercent: number, stopDistance: number): string {
  if (riskPercent <= 0 || stopDistance <= 0) return "konservativ";
  if (riskPercent <= 1 && stopDistance <= 1) return "konservativ";
  if (riskPercent <= 2 && stopDistance <= 2) return "moderat";
  return "aggressiv";
}

function pushHint(hints: RiskHint[], level: RiskHintLevel, message: string): void {
  hints.push({ level, message });
}
