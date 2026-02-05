import { clamp } from "@/src/lib/math";
import type { Setup } from "@/src/lib/engine/types";
import type { SetupProfile } from "@/src/lib/config/setupProfile";

export type SignalQualityGrade = "A" | "B" | "C" | "D";

export type SignalQuality = {
  grade: SignalQualityGrade;
  score: number;
  labelKey: string;
  reasons: string[];
};

const DEFAULT_LABEL_PREFIX = "perception.signalQuality.grade.";

const clampPercent = (value?: number | null): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return clamp(Math.round(value), 0, 100);
};

export function computeSignalQuality(
  setup: Setup,
  options?: { profile?: SetupProfile; conflictIndicator?: boolean },
): SignalQuality {
  const profile = (options?.profile ?? setup.profile ?? "INTRADAY") as SetupProfile;
  const isSwing = profile === "SWING";
  const ringOrderflowFlags =
    (setup.rings as { orderflowFlags?: string[] } | undefined)?.orderflowFlags ?? [];
  const orderflowFlags = setup.orderflow?.flags ?? ringOrderflowFlags ?? [];
  const conflictIndicator =
    options?.conflictIndicator === true ||
    orderflowFlags.some((flag) => flag.includes("conflict")) ||
    (setup.decisionReasons ?? []).some((reason) => typeof reason === "string" && reason.includes("conflict"));

  const trend = clampPercent(setup.rings?.trendScore);
  const bias = clampPercent(setup.rings?.biasScore);
  const sentiment = clampPercent(setup.rings?.sentimentScore);
  const orderflow = clampPercent(setup.rings?.orderflowScore);
  const confidence = clampPercent(setup.rings?.confidenceScore ?? setup.confidence);
  const eventScore = clampPercent(setup.rings?.eventScore);

  const inputs = [trend, bias, sentiment, orderflow, confidence].filter(
    (value): value is number => value !== null,
  );
  const baseScore = inputs.length > 0 ? inputs.reduce((sum, value) => sum + value, 0) / inputs.length : 50;

  let adjusted = baseScore;
  const reasons: string[] = [];

  let hasOtherNegative = false;

  if (trend !== null && bias !== null) {
    const delta = Math.abs(trend - bias);
    const swingConflict = isSwing && conflictIndicator && delta >= 25;
    if (swingConflict) {
      adjusted -= 12;
      reasons.push("perception.signalQuality.reason.trendBiasConflict");
      hasOtherNegative = true;
    } else if (!isSwing && delta > 30) {
      adjusted -= 10;
      reasons.push("perception.signalQuality.reason.trendBiasConflict");
      hasOtherNegative = true;
    } else if (trend > 60 && bias > 60 && delta < 15) {
      adjusted += 5;
      reasons.push("perception.signalQuality.reason.trendBiasAligned");
    }
  }

  if (orderflow !== null) {
    if (orderflow >= 65) {
      adjusted += 3;
      reasons.push("perception.signalQuality.reason.strongOrderflow");
    } else if (orderflow <= 40) {
      adjusted -= 6;
      reasons.push("perception.signalQuality.reason.weakOrderflow");
      hasOtherNegative = true;
    }
  }

  if (eventScore !== null && eventScore >= 70) {
    adjusted -= 7;
    reasons.push("perception.signalQuality.reason.eventRiskElevated");
    hasOtherNegative = true;
  }

  if (sentiment !== null && (sentiment >= 80 || sentiment <= 20)) {
    adjusted -= 4;
    reasons.push("perception.signalQuality.reason.sentimentExtreme");
    hasOtherNegative = true;
  }

  const lowConfidenceThreshold = 45;
  const lowConfidenceHit = confidence !== null && confidence <= lowConfidenceThreshold;
  if (lowConfidenceHit) {
    const penalty = isSwing ? -3 : -5;
    adjusted += penalty;
    reasons.push("perception.signalQuality.reason.lowConfidence");
    if (!isSwing) {
      hasOtherNegative = true;
    }
  }

  let finalScore = clamp(Math.round(adjusted), 0, 100);

  if (isSwing && lowConfidenceHit && !hasOtherNegative && finalScore < 60) {
    finalScore = 60;
  }

  let grade: SignalQualityGrade = "D";
  if (finalScore >= 80) grade = "A";
  else if (finalScore >= 60) grade = "B";
  else if (finalScore >= 40) grade = "C";

  const labelKey = `${DEFAULT_LABEL_PREFIX}${grade}`;
  if (reasons.length === 0) {
    reasons.push("perception.signalQuality.reason.default");
  }

  return {
    grade,
    score: finalScore,
    labelKey,
    reasons,
  };
}
