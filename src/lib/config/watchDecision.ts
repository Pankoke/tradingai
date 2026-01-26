export const watchEnabledPlaybookIds = new Set<string>([
  "gold-swing-v0.2",
  "crypto-swing-v0.1",
  "spx-swing-v0.1",
  "dax-swing-v0.1",
  "ndx-swing-v0.1",
  "dow-swing-v0.1",
  "eurusd-swing-v0.1",
  "gbpusd-swing-v0.1",
  "usdjpy-swing-v0.1",
  "eurjpy-swing-v0.1",
]);

export const hardReasonKeywords = ["event", "knockout", "conflict", "stale", "missing", "invalid", "rrr"];
export const softReasonKeywords = ["bias", "trend", "signal", "confidence", "quality", "confirmation", "chop", "alignment", "regime", "range"];

export const tradeRequirementsByPlaybook: Record<string, string[]> = {
  "gold-swing-v0.2": ["Bias >= 70", "Trend >= 50", "Signalqualitaet >= 55", "Confidence >= 60"],
  "crypto-swing-v0.1": ["Bias >= 70", "Trend >= 50", "Signalqualitaet >= 55", "Confidence >= 60"],
  "spx-swing-v0.1": ["Bias >= 70", "Trend >= 60", "Signalqualitaet >= 55", "Confidence >= 55"],
  "dax-swing-v0.1": ["Bias >= 70", "Trend >= 60", "Signalqualitaet >= 55", "Confidence >= 55"],
  "ndx-swing-v0.1": ["Bias >= 70", "Trend >= 60", "Signalqualitaet >= 55", "Confidence >= 55"],
  "dow-swing-v0.1": ["Bias >= 70", "Trend >= 60", "Signalqualitaet >= 55", "Confidence >= 55"],
  "eurusd-swing-v0.1": ["Bias >= 65", "Trend >= 50", "Signalqualitaet >= 55", "Confidence >= 55"],
  "gbpusd-swing-v0.1": ["Bias >= 65", "Trend >= 50", "Signalqualitaet >= 55", "Confidence >= 55"],
  "usdjpy-swing-v0.1": ["Bias >= 65", "Trend >= 50", "Signalqualitaet >= 55", "Confidence >= 55"],
  "eurjpy-swing-v0.1": ["Bias >= 65", "Trend >= 50", "Signalqualitaet >= 55", "Confidence >= 55"],
};

export type SetupDecision = "TRADE" | "WATCH_PLUS" | "WATCH" | "BLOCKED";
export type SetupDecisionCategory = "soft" | "hard";
