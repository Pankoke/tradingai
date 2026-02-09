import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";

export type DriverCopyBullet = {
  key: string;
  params?: Record<string, string | number>;
};

export function buildSignalScoreDriverBullets(vm: SetupViewModel): DriverCopyBullet[] {
  const signalReasons = vm.signalQuality?.reasons ?? [];
  const trend = score(vm.rings.trendScore);
  const bias = score(vm.rings.biasScore);
  const event = score(vm.rings.eventScore);
  const sentiment = score(vm.rings.sentimentScore);
  const orderflow = score(vm.rings.orderflowScore);
  const signalScore = score(vm.signalQuality?.score ?? null);
  const delta = Math.abs(trend - bias);

  const mappedFromReasons = signalReasons.map(mapSignalReasonToBullet).filter((value): value is DriverCopyBullet => value !== null);
  const derived: DriverCopyBullet[] = [
    trend >= 65 && bias >= 65 && delta < 20
      ? { key: "setup.scoreDrivers.signal.trendBiasAligned", params: { trend, bias } }
      : null,
    delta >= 25 ? { key: "setup.scoreDrivers.signal.trendBiasConflict", params: { delta } } : null,
    orderflow >= 65 ? { key: "setup.scoreDrivers.signal.orderflowStrong", params: { score: orderflow } } : null,
    orderflow <= 40 ? { key: "setup.scoreDrivers.signal.orderflowWeak", params: { score: orderflow } } : null,
    event >= 70 ? { key: "setup.scoreDrivers.signal.eventRiskElevated", params: { score: event } } : null,
    sentiment >= 80 || sentiment <= 20 ? { key: "setup.scoreDrivers.signal.sentimentExtreme", params: { score: sentiment } } : null,
    signalScore >= 75 ? { key: "setup.scoreDrivers.signal.signalQualityStrong", params: { score: signalScore } } : null,
    signalScore < 50 ? { key: "setup.scoreDrivers.signal.signalQualityMixed", params: { score: signalScore } } : null,
  ].filter((value): value is DriverCopyBullet => value !== null);

  const merged = dedupeBullets([...mappedFromReasons, ...derived]);
  if (merged.length > 0) return merged.slice(0, 3);

  return [{ key: "setup.scoreDrivers.signal.coreContextStable" }];
}

export function buildConfidenceScoreDriverBullets(
  vm: SetupViewModel,
  options?: { modifierEnabled?: boolean },
): DriverCopyBullet[] {
  const confidence = score(vm.rings.confidenceScore ?? null);
  const event = score(vm.rings.eventScore);
  const delta = Math.abs(score(vm.rings.trendScore) - score(vm.rings.biasScore));
  const noTradeReason = vm.noTradeReason?.trim() ?? null;
  const hasDecisionConstraint = vm.decision === "BLOCKED" || vm.setupGrade === "NO_TRADE";

  const consistency =
    confidence >= 70
      ? { key: "setup.scoreDrivers.confidence.consistencyHigh", params: { score: confidence } }
      : confidence >= 50
        ? { key: "setup.scoreDrivers.confidence.consistencyMedium", params: { score: confidence } }
        : { key: "setup.scoreDrivers.confidence.consistencyLow", params: { score: confidence } };

  const eventRisk = options?.modifierEnabled
    ? { key: "setup.scoreDrivers.confidence.eventRiskLow", params: { score: 0 } }
    : event >= 70
      ? { key: "setup.scoreDrivers.confidence.eventRiskHigh", params: { score: event } }
      : event >= 40
        ? { key: "setup.scoreDrivers.confidence.eventRiskMedium", params: { score: event } }
        : { key: "setup.scoreDrivers.confidence.eventRiskLow", params: { score: event } };

  const extras: DriverCopyBullet[] = [
    delta >= 25 ? { key: "setup.scoreDrivers.confidence.alignmentMixed", params: { delta } } : null,
    hasDecisionConstraint
      ? {
          key: "setup.scoreDrivers.confidence.decisionConstraint",
          params: { reason: noTradeReason ? ` (${truncateReason(noTradeReason)})` : "" },
        }
      : null,
  ].filter((value): value is DriverCopyBullet => value !== null);

  return dedupeBullets([consistency, eventRisk, ...extras]).slice(0, 3);
}

function mapSignalReasonToBullet(reason: string): DriverCopyBullet | null {
  switch (reason) {
    case "perception.signalQuality.reason.trendBiasConflict":
      return { key: "setup.scoreDrivers.signal.trendBiasConflict.generic" };
    case "perception.signalQuality.reason.trendBiasAligned":
      return { key: "setup.scoreDrivers.signal.trendBiasAligned.generic" };
    case "perception.signalQuality.reason.strongOrderflow":
      return { key: "setup.scoreDrivers.signal.orderflowStrong.generic" };
    case "perception.signalQuality.reason.weakOrderflow":
      return { key: "setup.scoreDrivers.signal.orderflowWeak.generic" };
    case "perception.signalQuality.reason.eventRiskElevated":
      return { key: "setup.scoreDrivers.signal.eventRiskElevated.generic" };
    case "perception.signalQuality.reason.sentimentExtreme":
      return { key: "setup.scoreDrivers.signal.sentimentExtreme.generic" };
    case "perception.signalQuality.reason.lowConfidence":
      return { key: "setup.scoreDrivers.signal.lowConfidence.generic" };
    default:
      return null;
  }
}

function dedupeBullets(values: DriverCopyBullet[]): DriverCopyBullet[] {
  const seen = new Set<string>();
  const result: DriverCopyBullet[] = [];
  for (const value of values) {
    const normalized = normalizeBulletKey(value.key);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value);
  }
  return result;
}

function normalizeBulletKey(key: string): string {
  return key.replace(".generic", "");
}

function score(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function truncateReason(value: string): string {
  if (value.length <= 60) return value;
  return `${value.slice(0, 59)}…`;
}
