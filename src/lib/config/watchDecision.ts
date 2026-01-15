export const watchEnabledPlaybookIds = new Set<string>(["gold-swing-v0.2"]);

export const hardReasonKeywords = ["event", "knockout", "conflict", "stale", "missing", "invalid", "rrr"];
export const softReasonKeywords = ["bias", "trend", "signal", "confidence", "quality"];

export const tradeRequirementsByPlaybook: Record<string, string[]> = {
  "gold-swing-v0.2": ["Bias ≥ 70", "Trend ≥ 50", "Signalqualität ≥ 55", "Confidence ≥ 60"],
};

export type SetupDecision = "TRADE" | "WATCH" | "BLOCKED";
export type SetupDecisionCategory = "soft" | "hard";
