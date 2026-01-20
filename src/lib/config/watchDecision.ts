export const watchEnabledPlaybookIds = new Set<string>([
  "gold-swing-v0.2",
  "crypto-swing-v0.1",
  "spx-swing-v0.1",
  "dax-swing-v0.1",
  "ndx-swing-v0.1",
]);

export const hardReasonKeywords = ["event", "knockout", "conflict", "stale", "missing", "invalid", "rrr"];
export const softReasonKeywords = ["bias", "trend", "signal", "confidence", "quality", "confirmation", "chop", "alignment", "regime", "range"];

export const tradeRequirementsByPlaybook: Record<string, string[]> = {
  "gold-swing-v0.2": ["Bias >= 70", "Trend >= 50", "Signalqualitaet >= 55", "Confidence >= 60"],
  "crypto-swing-v0.1": ["Bias >= 70", "Trend >= 50", "Signalqualitaet >= 55", "Confidence >= 60"],
  "spx-swing-v0.1": ["Bias >= 70", "Trend >= 60", "Signalqualitaet >= 55", "Confidence >= 55"],
  "dax-swing-v0.1": ["Bias >= 70", "Trend >= 60", "Signalqualitaet >= 55", "Confidence >= 55"],
  "ndx-swing-v0.1": ["Bias >= 70", "Trend >= 60", "Signalqualitaet >= 55", "Confidence >= 55"],
};

export type SetupDecision = "TRADE" | "WATCH" | "BLOCKED";
export type SetupDecisionCategory = "soft" | "hard";
