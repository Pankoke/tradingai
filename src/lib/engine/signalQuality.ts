import { clamp } from "@/src/lib/math";
import type { Setup } from "@/src/lib/engine/types";

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

export function computeSignalQuality(setup: Setup): SignalQuality {
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

  if (trend !== null && bias !== null) {
    const delta = Math.abs(trend - bias);
    if (delta > 30) {
      adjusted -= 10;
      reasons.push("perception.signalQuality.reason.trendBiasConflict");
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
    }
  }

  if (eventScore !== null && eventScore >= 70) {
    adjusted -= 7;
    reasons.push("perception.signalQuality.reason.eventRiskElevated");
  }

  if (sentiment !== null && (sentiment >= 80 || sentiment <= 20)) {
    adjusted -= 4;
    reasons.push("perception.signalQuality.reason.sentimentExtreme");
  }

  if (confidence !== null && confidence <= 45) {
    adjusted -= 5;
    reasons.push("perception.signalQuality.reason.lowConfidence");
  }

  const finalScore = clamp(Math.round(adjusted), 0, 100);
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
