import type { EventModifier } from "@/src/lib/engine/types";
import type { SignalQuality } from "@/src/lib/engine/signalQuality";

export type SetupGrade = "A" | "B" | "NO_TRADE";
export type SetupPlaybookType = "pullback_continuation" | "range_bias" | "unknown";

export type PlaybookEvaluation = {
  setupGrade: SetupGrade;
  setupType: SetupPlaybookType;
  gradeRationale: string[];
  noTradeReason?: string;
};

type PlaybookContext = {
  asset: { id?: string | null; symbol: string; name?: string | null };
  profile?: string | null;
  rings: {
    trendScore: number;
    biasScore: number;
    sentimentScore: number | null | undefined;
    orderflowScore: number;
  };
  eventModifier?: EventModifier | null;
  signalQuality?: SignalQuality | null;
  orderflow?: {
    score?: number | null;
    flags?: string[] | null;
    reasons?: string[] | null;
    reasonDetails?: Array<{ text?: string; category?: string }> | null;
  } | null;
};

export type Playbook = {
  id: string;
  label: string;
  shortLabel: string;
  evaluateSetup: (context: PlaybookContext) => PlaybookEvaluation;
};

type PlaybookResolution = {
  playbook: Playbook;
  reason: string;
};

const SWING_EVENT_WINDOW_MINUTES = 48 * 60;
const ORDERFLOW_NEGATIVE_THRESHOLD = 30;
const SIGNAL_QUALITY_FLOOR = 40;
const GOLD_PLAYBOOK_ID = "gold-swing-v0.2";
const INDEX_PLAYBOOK_ID = "index-swing-v0.1";
const CRYPTO_PLAYBOOK_ID = "crypto-swing-v0.1";
const FX_PLAYBOOK_ID = "fx-swing-v0.1";
const GENERIC_PLAYBOOK_ID = "generic-swing-v0.1";

type MatchResult = { matched: boolean; reason: string };

function matchGoldAsset(asset: PlaybookContext["asset"]): MatchResult {
  const id = (asset.id ?? "").toUpperCase();
  const symbol = (asset.symbol ?? "").toUpperCase();
  const name = (asset.name ?? "").toUpperCase();
  if (id === "GOLD") return { matched: true, reason: "gold id" };
  if (symbol.startsWith("GC")) return { matched: true, reason: "gold via GC symbol" };
  if (symbol.includes("XAU")) return { matched: true, reason: "gold via XAU symbol" };
  if (symbol === "GOLD") return { matched: true, reason: "gold symbol" };
  if (name.includes("GOLD")) return { matched: true, reason: "gold name" };
  return { matched: false, reason: "no gold match" };
}

function matchIndexAsset(asset: PlaybookContext["asset"]): MatchResult {
  const symbol = (asset.symbol ?? "").toUpperCase();
  const name = (asset.name ?? "").toUpperCase();
  if (symbol.startsWith("^")) return { matched: true, reason: "index caret symbol" };
  const known = ["GSPC", "NDX", "DJI", "GDAXI", "FTSE", "STOXX", "HSI", "NIKKEI", "IBEX"];
  if (known.some((k) => symbol.includes(k))) return { matched: true, reason: "index keyword symbol" };
  if (name.includes("INDEX")) return { matched: true, reason: "index name" };
  return { matched: false, reason: "no index match" };
}

function matchFxAsset(asset: PlaybookContext["asset"]): MatchResult {
  const symbol = (asset.symbol ?? "").toUpperCase();
  if (symbol.endsWith("=X")) return { matched: true, reason: "fx yahoo =X" };
  const fxRegex = /^[A-Z]{6}$/;
  if (fxRegex.test(symbol) && symbol.includes("USD")) return { matched: true, reason: "fx 6-letter with USD" };
  return { matched: false, reason: "no fx match" };
}

function matchCryptoAsset(asset: PlaybookContext["asset"]): MatchResult {
  const symbol = (asset.symbol ?? "").toUpperCase();
  if (symbol.includes("=X")) return { matched: false, reason: "yahoo fx - skip crypto" };
  if (symbol.includes("-USD")) return { matched: true, reason: "crypto hyphen USD" };
  if (symbol.endsWith("USDT") || symbol.endsWith("USD")) return { matched: true, reason: "crypto USD/USDT tail" };
  return { matched: false, reason: "no crypto match" };
}

function resolvePlaybookIdForAsset(asset: PlaybookContext["asset"], profile?: string | null): PlaybookResolution {
  const profileKey = (profile ?? "").toLowerCase();
  if (!profileKey.includes("swing")) {
    return { playbook: genericSwingPlaybook, reason: "non-swing profile" };
  }

  const gold = matchGoldAsset(asset);
  if (gold.matched) return { playbook: goldSwingPlaybook, reason: gold.reason };

  const index = matchIndexAsset(asset);
  if (index.matched) return { playbook: indexSwingPlaybook, reason: index.reason };

  const crypto = matchCryptoAsset(asset);
  if (crypto.matched) return { playbook: cryptoSwingPlaybook, reason: crypto.reason };

  const fx = matchFxAsset(asset);
  if (fx.matched) return { playbook: fxSwingPlaybook, reason: fx.reason };

  return { playbook: genericSwingPlaybook, reason: "fallback generic" };
}

function deriveSetupType(rings: PlaybookContext["rings"]): SetupPlaybookType {
  if (rings.trendScore >= 50 && rings.biasScore >= 70) return "pullback_continuation";
  if (rings.biasScore >= 70) return "range_bias";
  return "unknown";
}

function hasNegativeOrderflowFlags(orderflow?: PlaybookContext["orderflow"]): boolean {
  const flags = (orderflow?.flags ?? []).map((f) => f.toLowerCase());
  const reasons = (orderflow?.reasons ?? []).map((r) => r.toLowerCase());
  const details = (orderflow?.reasonDetails ?? []).map((d) => (d.text ?? "").toLowerCase());
  const negativePatterns = ["risk", "sell", "pressure", "distribution", "bear", "unruh", "expansion", "negative"];
  const textBlocks = [...flags, ...reasons, ...details];
  return textBlocks.some((text) => negativePatterns.some((pat) => text.includes(pat)));
}

function evaluateGoldSwing(context: PlaybookContext): PlaybookEvaluation {
  const { rings, eventModifier, signalQuality, orderflow } = context;
  const rationale: string[] = [];
  const sentimentScore = typeof rings.sentimentScore === "number" ? rings.sentimentScore : null;
  const sentimentMissing = sentimentScore === null || Number.isNaN(sentimentScore);

  const orderflowScore = typeof rings.orderflowScore === "number" ? rings.orderflowScore : 50;
  const orderflowNegative = orderflowScore < ORDERFLOW_NEGATIVE_THRESHOLD || hasNegativeOrderflowFlags(orderflow);

  const withinCriticalWindow =
    eventModifier?.classification === "execution_critical" &&
    typeof eventModifier.primaryEvent?.minutesToEvent === "number" &&
    eventModifier.primaryEvent.minutesToEvent >= 0 &&
    eventModifier.primaryEvent.minutesToEvent <= SWING_EVENT_WINDOW_MINUTES;

  // Hard exclusions for A / overall NO_TRADE gates
  if (
    withinCriticalWindow ||
    rings.biasScore < 70 ||
    rings.trendScore < 45 ||
    orderflowNegative ||
    (signalQuality && signalQuality.score < 40)
  ) {
    const reason = withinCriticalWindow
      ? "Execution-critical event within 48h"
      : orderflowNegative
        ? "Orderflow negative"
        : rings.trendScore < 45
          ? "Trend too weak"
          : rings.biasScore < 70
            ? "Bias too weak"
            : "Signal quality too low";
    return {
      setupGrade: "NO_TRADE",
      setupType: deriveSetupType(rings),
      gradeRationale: [],
      noTradeReason: reason,
    };
  }

  const baseRationale = () => {
    rationale.push("Bias strong (>=80)");
    rationale.push("Trend supportive (>=55)");
    rationale.push("Orderflow not negative");
    rationale.push("No execution-critical events");
  };

  const strengthTrigger = [
    rings.biasScore >= 90 ? "Bias >=90" : null,
    rings.trendScore >= 65 ? "Trend >=65" : null,
    orderflowScore >= 55 ? "Orderflow >=55" : null,
    signalQuality && signalQuality.score >= 70 ? "SignalQuality >=70" : null,
  ].filter(Boolean) as string[];

  const sentimentOk = sentimentMissing || sentimentScore >= 55;

  const qualifiesForA =
    rings.biasScore >= 80 &&
    rings.trendScore >= 55 &&
    sentimentOk &&
    !orderflowNegative &&
    eventModifier?.classification !== "execution_critical";

  if (qualifiesForA && strengthTrigger.length > 0) {
    baseRationale();
    rationale.push(`Strength trigger: ${strengthTrigger[0]}`);
    if (sentimentMissing) rationale.push("Sentiment missing");
    return {
      setupGrade: "A",
      setupType: deriveSetupType(rings),
      gradeRationale: rationale.slice(0, 3),
    };
  }

  const qualifiesForAMinus =
    qualifiesForA ||
    (rings.biasScore >= 80 &&
      rings.trendScore >= 55 &&
      !orderflowNegative &&
      (eventModifier?.classification === "context_relevant" ||
        eventModifier?.classification === "awareness_only" ||
        (rings.trendScore >= 55 && rings.trendScore <= 64) ||
        (orderflowScore >= 40 && orderflowScore <= 54) ||
        sentimentMissing));

  if (qualifiesForAMinus) {
    baseRationale();
    if (eventModifier?.classification === "context_relevant" || eventModifier?.classification === "awareness_only") {
      rationale.push(`Event context: ${eventModifier.classification}`);
    }
    if (rings.trendScore <= 64) rationale.push("Trend only moderate");
    if (orderflowScore <= 54) rationale.push("Orderflow neutral - watch structure");
    if (sentimentMissing) rationale.push("Sentiment missing");
    if (strengthTrigger.length === 0) rationale.push("Strength trigger missing");
    return {
      setupGrade: "A",
      setupType: deriveSetupType(rings),
      gradeRationale: rationale.slice(0, 3),
    };
  }

  const qualifiesForB = rings.biasScore >= 70 && rings.trendScore >= 45 && !orderflowNegative;
  if (qualifiesForB) {
    rationale.push("Bias constructive (>=70)");
    rationale.push("Trend adequate (>=45)");
    rationale.push("Orderflow not negative");
    return {
      setupGrade: "B",
      setupType: deriveSetupType(rings),
      gradeRationale: rationale.slice(0, 3),
    };
  }

  return {
    setupGrade: "NO_TRADE",
    setupType: deriveSetupType(rings),
    gradeRationale: [],
    noTradeReason: "No qualifying alignment",
  };
}

function evaluateDefault(context: PlaybookContext): PlaybookEvaluation {
  const { rings } = context;
  if (rings.biasScore >= 70 && rings.trendScore >= 45) {
    return {
      setupGrade: "B",
      setupType: deriveSetupType(rings),
      gradeRationale: ["Default alignment: bias & trend supportive"],
    };
  }
  return {
    setupGrade: "NO_TRADE",
    setupType: deriveSetupType(rings),
    gradeRationale: [],
    noTradeReason: "No default alignment",
  };
}

const goldSwingPlaybook: Playbook = {
  id: GOLD_PLAYBOOK_ID,
  label: "Gold Swing",
  shortLabel: "Gold",
  evaluateSetup: evaluateGoldSwing,
};

const indexSwingPlaybook: Playbook = {
  id: INDEX_PLAYBOOK_ID,
  label: "Index Swing",
  shortLabel: "Index",
  evaluateSetup: evaluateDefault,
};

const cryptoSwingPlaybook: Playbook = {
  id: CRYPTO_PLAYBOOK_ID,
  label: "Crypto Swing",
  shortLabel: "Crypto",
  evaluateSetup: evaluateDefault,
};

const fxSwingPlaybook: Playbook = {
  id: FX_PLAYBOOK_ID,
  label: "FX Swing",
  shortLabel: "FX",
  evaluateSetup: evaluateDefault,
};

const genericSwingPlaybook: Playbook = {
  id: GENERIC_PLAYBOOK_ID,
  label: "Generic Swing",
  shortLabel: "Generic",
  evaluateSetup: evaluateDefault,
};

const PLAYBOOK_LABELS: Record<string, { label: string; short: string }> = {
  [GOLD_PLAYBOOK_ID]: { label: "Gold Swing", short: "Gold Swing" },
  [INDEX_PLAYBOOK_ID]: { label: "Index Swing", short: "Index Swing" },
  [CRYPTO_PLAYBOOK_ID]: { label: "Crypto Swing", short: "Crypto Swing" },
  [FX_PLAYBOOK_ID]: { label: "FX Swing", short: "FX Swing" },
  [GENERIC_PLAYBOOK_ID]: { label: "Generic Swing", short: "Generic Swing" },
};

export const playbookTestExports = {
  evaluateGoldSwing,
  evaluateDefault,
  deriveSetupType,
  matchGoldAsset,
  matchIndexAsset,
  matchCryptoAsset,
  matchFxAsset,
  resolvePlaybookIdForAsset,
};

export function resolvePlaybookWithReason(
  asset: PlaybookContext["asset"],
  profile?: string | null,
): PlaybookResolution {
  return resolvePlaybookIdForAsset(asset, profile);
}

export function resolvePlaybook(asset: PlaybookContext["asset"], profile?: string | null): Playbook {
  return resolvePlaybookWithReason(asset, profile).playbook;
}

export function getPlaybookLabel(playbookId?: string | null, locale: "en" | "de" = "en"): string | null {
  if (!playbookId) return null;
  const meta = PLAYBOOK_LABELS[playbookId];
  if (!meta) return null;
  if (locale === "de") {
    if (playbookId === GOLD_PLAYBOOK_ID) return "Gold Swing";
    if (playbookId === INDEX_PLAYBOOK_ID) return "Index Swing";
    if (playbookId === CRYPTO_PLAYBOOK_ID) return "Krypto Swing";
    if (playbookId === FX_PLAYBOOK_ID) return "FX Swing";
    if (playbookId === GENERIC_PLAYBOOK_ID) return "Generic Swing";
  }
  return meta.label;
}
