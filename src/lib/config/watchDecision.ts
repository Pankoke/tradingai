export const watchEnabledPlaybookIds = new Set<string>(["gold-swing-v0.2"]);

export const hardReasonKeywords = ["event", "knockout", "conflict", "stale", "missing", "invalid", "rrr"];
export const softReasonKeywords = ["bias", "trend", "signal", "confidence", "quality"];

export type SetupDecision = "TRADE" | "WATCH" | "BLOCKED";
export type SetupDecisionCategory = "soft" | "hard";
