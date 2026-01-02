export type HelpKey =
  | "closedOnly"
  | "includeNoTrade"
  | "signalQuality"
  | "confidence"
  | "expiry"
  | "utility"
  | "guardrails"
  | "eligible"
  | "hitRate"
  | "winLoss";

export const helpText: Record<HelpKey, string> = {
  closedOnly: "Nur abgeschlossene Trades (TP/SL/Expired/Ambiguous) werden ausgewertet.",
  includeNoTrade: "Zeigt auch Faelle, in denen das Playbook keinen Trade zugelassen haette (Opportunity-Sicht).",
  signalQuality: "Signal Quality: Qualitaet des Setups - hoeher bedeutet strengeres Filtern.",
  confidence: "Confidence: Zuverlaessigkeit/Ueberzeugung - hoeher bedeutet strengeres Filtern.",
  expiry: "Ausgelaufen: Trade hat weder TP noch SL erreicht, Timing verpasst.",
  utility: "Utility: Trefferquote belohnt, Auslaufen bestraft - nur als Vergleichswert gedacht.",
  guardrails: "Mindestanforderungen, um Empfehlungen nicht auf Mini-Stichproben zu stuetzen.",
  eligible: "Handelbar/Eligible: Setups, die alle Filter (SQ/Conf/Closed-only usw.) passieren.",
  hitRate: "Trefferquote: TP / (TP + SL).",
  winLoss: "TP/SL Verhaeltnis: Wie viele TP auf einen SL kommen.",
};

export function formatGuardrailUnmet(unmet: string): string {
  const lowered = unmet.toLowerCase();
  if (lowered.includes("closedtotal")) return "Zu wenige abgeschlossene Trades.";
  if (lowered.includes("hit_tp") || lowered.includes("hit tp")) return "Zu wenige Treffer (TP).";
  if (lowered.includes("expiry")) return "Expiry-Rate ist zu hoch.";
  if (lowered.includes("utility")) return "Utility unter Mindestwert.";
  return `Bedingung nicht erfuellt: ${unmet}`;
}
