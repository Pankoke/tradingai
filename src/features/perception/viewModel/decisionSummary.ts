import type { SetupGrade, SetupPlaybookType } from "@/src/lib/engine/types";
import type { SignalQualityGrade } from "@/src/lib/engine/signalQuality";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";

export type DecisionExecutionMode = "confirmation" | "breakout" | "pullback" | "wait";
export type DecisionSummaryBand = "A" | "B" | "C";
export type SummaryParamValue = string | number;

export type SummaryBullet = {
  key: string;
  params?: Record<string, SummaryParamValue>;
};

export type DecisionSummaryVM = {
  interpretation: {
    key: string;
    params?: Record<string, SummaryParamValue>;
  };
  band?: DecisionSummaryBand;
  executionMode: DecisionExecutionMode;
  pros: SummaryBullet[];
  cautions: SummaryBullet[];
  reasonsAgainst?: SummaryBullet[];
};

export function buildDecisionSummaryVM(input: SetupViewModel): DecisionSummaryVM {
  const trendScore = safeScore(input.rings.trendScore);
  const biasScore = safeScore(input.rings.biasScore);
  const sentimentScore = safeScore(input.rings.sentimentScore);
  const orderflowScore = safeScore(input.rings.orderflowScore);
  const eventScore = safeScore(input.rings.eventScore);
  const confidenceScore = safeScore(input.rings.confidenceScore ?? null);
  const signalQualityScore = safeScore(input.signalQuality?.score ?? null);
  const rrr = safeNumber(input.riskReward?.rrr ?? null);
  const eventCritical = input.eventModifier?.classification === "execution_critical";
  const decisionBlocked = input.decision === "BLOCKED";
  const gradeNoTrade = input.setupGrade === "NO_TRADE";
  const isHardStop = decisionBlocked || gradeNoTrade;
  const trendBiasDelta = Math.abs(trendScore - biasScore);

  const executionMode = resolveExecutionMode({
    setupType: input.setupType ?? null,
    decisionSegment: input.decisionSegment ?? null,
    isHardStop,
    eventCritical,
    trendScore,
    trendBiasDelta,
    signalQualityScore,
    orderflowScore,
  });

  const pros = limitBullets(
    [
      biasScore >= 65 ? bullet("setup.decisionSummary.pro.biasStrong", { score: biasScore }) : null,
      trendScore >= 60 ? bullet("setup.decisionSummary.pro.trendSupportive", { score: trendScore }) : null,
      signalQualityScore >= 70 ? bullet("setup.decisionSummary.pro.signalQualityStrong", { score: signalQualityScore }) : null,
      rrr !== null && rrr >= 2 ? bullet("setup.decisionSummary.pro.rrrFavorable", { rrr: toFixed(rrr, 2) }) : null,
      orderflowScore >= 60 ? bullet("setup.decisionSummary.pro.orderflowSupportive", { score: orderflowScore }) : null,
      confidenceScore >= 65 ? bullet("setup.decisionSummary.pro.confidenceStable", { score: confidenceScore }) : null,
    ],
    3,
  );

  const cautions = limitBullets(
    [
      trendScore < 50 ? bullet("setup.decisionSummary.caution.trendWeak", { score: trendScore }) : null,
      trendBiasDelta >= 25 ? bullet("setup.decisionSummary.caution.alignmentMixed", { delta: trendBiasDelta }) : null,
      sentimentScore <= 55 ? bullet("setup.decisionSummary.caution.sentimentNonDirectional", { score: sentimentScore }) : null,
      orderflowScore < 45 ? bullet("setup.decisionSummary.caution.orderflowWeak", { score: orderflowScore }) : null,
      eventCritical || eventScore >= 70 ? bullet("setup.decisionSummary.caution.eventRiskElevated", { score: eventScore }) : null,
      rrr !== null && rrr < 1.8 ? bullet("setup.decisionSummary.caution.rrrLimited", { rrr: toFixed(rrr, 2) }) : null,
      confidenceScore < 55 ? bullet("setup.decisionSummary.caution.confidenceMixed", { score: confidenceScore }) : null,
    ],
    3,
  );

  const reasonsAgainst = isHardStop
    ? limitBullets(resolveReasonsAgainst(input), 3)
    : undefined;

  const band = resolveBand({
    setupGrade: input.setupGrade ?? null,
    signalQualityGrade: input.signalQuality?.grade ?? null,
    signalQualityScore,
    confidenceScore,
    decisionBlocked,
  });

  const interpretation = resolveInterpretation({
    direction: input.direction,
    executionMode,
    band,
    prosCount: pros.length,
    cautionsCount: cautions.length,
    eventCritical,
    isHardStop,
  });

  return {
    interpretation,
    band,
    executionMode,
    pros,
    cautions,
    reasonsAgainst: reasonsAgainst && reasonsAgainst.length > 0 ? reasonsAgainst : undefined,
  };
}

function resolveExecutionMode(input: {
  setupType: SetupPlaybookType | null;
  decisionSegment: string | null;
  isHardStop: boolean;
  eventCritical: boolean;
  trendScore: number;
  trendBiasDelta: number;
  signalQualityScore: number;
  orderflowScore: number;
}): DecisionExecutionMode {
  if (input.isHardStop || input.eventCritical) return "wait";
  if (input.setupType === "pullback_continuation") return "pullback";
  if (containsToken(input.decisionSegment, ["pullback"])) return "pullback";
  if (containsToken(input.decisionSegment, ["breakout", "momentum"])) return "breakout";
  if (input.trendScore < 45 || input.trendBiasDelta >= 25) return "confirmation";
  if (input.signalQualityScore >= 70 && input.orderflowScore >= 60) return "breakout";
  return "confirmation";
}

function resolveBand(input: {
  setupGrade: SetupGrade | null;
  signalQualityGrade: SignalQualityGrade | null;
  signalQualityScore: number;
  confidenceScore: number;
  decisionBlocked: boolean;
}): DecisionSummaryBand {
  if (input.decisionBlocked) return "C";
  if (input.setupGrade === "A" || input.setupGrade === "B") return input.setupGrade;
  if (input.setupGrade === "NO_TRADE") return "C";
  if (input.signalQualityGrade === "A" || input.signalQualityGrade === "B" || input.signalQualityGrade === "C") {
    return input.signalQualityGrade;
  }
  if (input.signalQualityScore >= 75 && input.confidenceScore >= 65) return "A";
  if (input.signalQualityScore >= 55 && input.confidenceScore >= 50) return "B";
  return "C";
}

function resolveInterpretation(input: {
  direction: "Long" | "Short";
  executionMode: DecisionExecutionMode;
  band: DecisionSummaryBand;
  prosCount: number;
  cautionsCount: number;
  eventCritical: boolean;
  isHardStop: boolean;
}): { key: string; params: Record<string, SummaryParamValue> } {
  const direction = input.direction.toLowerCase();

  if (input.isHardStop && input.eventCritical) {
    return { key: "setup.decisionSummary.interpretation.blockedByEvent", params: { direction } };
  }
  if (input.isHardStop) {
    return { key: "setup.decisionSummary.interpretation.noTrade", params: { direction } };
  }
  if (input.executionMode === "wait") {
    return { key: "setup.decisionSummary.interpretation.confirmationRequired", params: { direction } };
  }
  if (input.executionMode === "confirmation" && input.band !== "A") {
    return { key: "setup.decisionSummary.interpretation.confirmationRequired", params: { direction } };
  }
  if (input.band === "A" && input.prosCount > input.cautionsCount) {
    return { key: "setup.decisionSummary.interpretation.strongAlignment", params: { direction } };
  }
  if (input.prosCount === 0) {
    return { key: "setup.decisionSummary.interpretation.noEdge", params: { direction } };
  }
  if (input.cautionsCount >= input.prosCount) {
    return { key: "setup.decisionSummary.interpretation.confirmationRequired", params: { direction } };
  }
  return { key: "setup.decisionSummary.interpretation.partialAlignment", params: { direction } };
}

function resolveReasonsAgainst(input: SetupViewModel): SummaryBullet[] {
  const values = [...(input.decisionReasons ?? []), input.noTradeReason ?? null]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (values.length === 0) {
    return [bullet("setup.decisionSummary.reasonAgainst.genericConstraint")];
  }

  const mapped = values.map((value) => mapReasonAgainst(value));
  return dedupeBullets(mapped);
}

function mapReasonAgainst(reason: string): SummaryBullet {
  const lower = reason.toLowerCase();
  if (containsToken(lower, ["event", "macro", "cpi", "release"])) {
    return bullet("setup.decisionSummary.reasonAgainst.eventConstraint");
  }
  if (containsToken(lower, ["bias"])) {
    return bullet("setup.decisionSummary.reasonAgainst.biasConstraint");
  }
  if (containsToken(lower, ["trend"])) {
    return bullet("setup.decisionSummary.reasonAgainst.trendConstraint");
  }
  if (containsToken(lower, ["signal", "quality"])) {
    return bullet("setup.decisionSummary.reasonAgainst.qualityConstraint");
  }
  if (containsToken(lower, ["rrr", "risk", "reward"])) {
    return bullet("setup.decisionSummary.reasonAgainst.rrrConstraint");
  }
  if (containsToken(lower, ["block"])) {
    return bullet("setup.decisionSummary.reasonAgainst.blockedConstraint");
  }
  return bullet("setup.decisionSummary.reasonAgainst.genericConstraint");
}

function bullet(key: string, params?: Record<string, SummaryParamValue>): SummaryBullet {
  return params && Object.keys(params).length > 0 ? { key, params } : { key };
}

function limitBullets(values: Array<SummaryBullet | null>, max: number): SummaryBullet[] {
  const compact = values.filter((value): value is SummaryBullet => value !== null);
  return dedupeBullets(compact).slice(0, max);
}

function dedupeBullets(values: SummaryBullet[]): SummaryBullet[] {
  const seen = new Set<string>();
  const result: SummaryBullet[] = [];
  for (const value of values) {
    if (seen.has(value.key)) continue;
    seen.add(value.key);
    result.push(value);
  }
  return result;
}

function safeScore(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function safeNumber(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function toFixed(value: number, digits: number): number {
  return Number.parseFloat(value.toFixed(digits));
}

function containsToken(source: string | null | undefined, tokens: string[]): boolean {
  if (!source) return false;
  const lower = source.toLowerCase();
  return tokens.some((token) => lower.includes(token));
}
