import type { EventModifier, RiskRewardSummary } from "@/src/lib/engine/types";
import type { SignalQuality } from "@/src/lib/engine/signalQuality";
import { deriveRegimeTag } from "@/src/lib/engine/metrics/regime";
import type { Setup } from "@/src/lib/engine/types";

export type SetupGrade = "A" | "B" | "NO_TRADE";
export type SetupPlaybookType = "pullback_continuation" | "range_bias" | "unknown";

export type PlaybookEvaluation = {
  setupGrade: SetupGrade;
  setupType: SetupPlaybookType;
  gradeRationale: string[];
  noTradeReason?: string;
  debugReason?: string;
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
  levels?: {
    entryZone?: string | null;
    stopLoss?: string | null;
    takeProfit?: string | null;
    riskReward?: RiskRewardSummary | null;
  };
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
const SIGNAL_QUALITY_BASE = 55;
// Phase0 (30d, gold) showed WATCH TP/SL win-rate ~83% (5/1) with many bias KOs.
// Keep A strict, loosen B bias gate: A uses 80, B uses 70.
const BIAS_MIN_A = 80;
const BIAS_MIN_B = 70;
const TREND_MIN = 50;
const SOFT_TREND_BIAS_DELTA = 20;
const GOLD_PLAYBOOK_ID = "gold-swing-v0.2";
const INDEX_PLAYBOOK_ID = "index-swing-v0.1";
const SPX_PLAYBOOK_ID = "spx-swing-v0.1";
const DAX_PLAYBOOK_ID = "dax-swing-v0.1";
const NDX_PLAYBOOK_ID = "ndx-swing-v0.1";
const CRYPTO_PLAYBOOK_ID = "crypto-swing-v0.1";
const FX_PLAYBOOK_ID = "fx-swing-v0.1";
const GENERIC_PLAYBOOK_ID = "generic-swing-v0.1";

export const goldPlaybookThresholds = {
  biasMinA: BIAS_MIN_A,
  biasMinB: BIAS_MIN_B,
  biasMin: BIAS_MIN_A, // legacy consumers; keep strict bias for A visible
  trendMin: TREND_MIN,
  signalQualityMin: SIGNAL_QUALITY_BASE,
  orderflowMin: ORDERFLOW_NEGATIVE_THRESHOLD,
};

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

function matchSpxAsset(asset: PlaybookContext["asset"]): MatchResult {
  const id = (asset.id ?? "").toLowerCase();
  const symbol = (asset.symbol ?? "").toUpperCase();
  if (id === "spx") return { matched: true, reason: "spx id" };
  if (symbol.includes("GSPC") || symbol === "^GSPC" || symbol === "SPX" || symbol.includes("SP500")) {
    return { matched: true, reason: "spx symbol" };
  }
  return { matched: false, reason: "no spx match" };
}

function matchDaxAsset(asset: PlaybookContext["asset"]): MatchResult {
  const id = (asset.id ?? "").toLowerCase();
  const symbol = (asset.symbol ?? "").toUpperCase();
  if (id === "dax") return { matched: true, reason: "dax id" };
  if (symbol.includes("GDAXI") || symbol.includes("DAX")) {
    return { matched: true, reason: "dax symbol" };
  }
  return { matched: false, reason: "no dax match" };
}

function matchNdxAsset(asset: PlaybookContext["asset"]): MatchResult {
  const id = (asset.id ?? "").toLowerCase();
  const symbol = (asset.symbol ?? "").toUpperCase();
  if (id === "ndx") return { matched: true, reason: "ndx id" };
  if (symbol.includes("NDX") || symbol.includes("NASDAQ 100") || symbol.includes("NAS100")) {
    return { matched: true, reason: "ndx symbol" };
  }
  return { matched: false, reason: "no ndx match" };
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

  const spx = matchSpxAsset(asset);
  if (spx.matched) return { playbook: spxSwingPlaybook, reason: spx.reason };

  const dax = matchDaxAsset(asset);
  if (dax.matched) return { playbook: daxSwingPlaybook, reason: dax.reason };

  const ndx = matchNdxAsset(asset);
  if (ndx.matched) return { playbook: ndxSwingPlaybook, reason: ndx.reason };

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

function isOrderflowNegative(context: PlaybookContext): boolean {
  const score = typeof context.rings.orderflowScore === "number" ? context.rings.orderflowScore : 50;
  return score < ORDERFLOW_NEGATIVE_THRESHOLD || hasNegativeOrderflowFlags(context.orderflow);
}

function hasTrendBiasConflict(context: PlaybookContext): boolean {
  const flags = (context.orderflow?.flags ?? []).map((f) => f.toLowerCase());
  return flags.includes("orderflow_trend_conflict") || flags.includes("orderflow_bias_conflict");
}

type GoldSwingFlags = {
  biasOk: boolean;
  biasOkA: boolean;
  trendOk: boolean;
  signalQualityOk: boolean;
  sentimentWeak: boolean;
  orderflowNegative: boolean;
  tbSoftDivergence: boolean;
  tbConflictHard: boolean;
  executionCritical: boolean;
  levelsOk: boolean;
  rrrUnattractive: boolean;
};

function evaluateGoldSwingConditions(context: PlaybookContext): GoldSwingFlags {
  const { rings, eventModifier, signalQuality, levels } = context;
  const biasOkA = rings.biasScore >= BIAS_MIN_A;
  const biasOkB = rings.biasScore >= BIAS_MIN_B;
  const trendOk = rings.trendScore >= TREND_MIN;
  const signalQualityOk = typeof signalQuality?.score === "number" ? signalQuality.score >= SIGNAL_QUALITY_BASE : false;
  const sentimentWeak = typeof rings.sentimentScore === "number" ? rings.sentimentScore < 55 : false;
  const orderflowNegative = isOrderflowNegative(context);
  const tbSoftDivergence = Math.abs(rings.biasScore - rings.trendScore) >= SOFT_TREND_BIAS_DELTA;
  const tbConflictHard = hasTrendBiasConflict(context);
  const executionCritical =
    eventModifier?.classification === "execution_critical" &&
    typeof eventModifier.primaryEvent?.minutesToEvent === "number" &&
    eventModifier.primaryEvent.minutesToEvent >= 0 &&
    eventModifier.primaryEvent.minutesToEvent <= SWING_EVENT_WINDOW_MINUTES;
  const levelsOk =
    Boolean(levels?.entryZone) && Boolean(levels?.stopLoss) && Boolean(levels?.takeProfit) && levels?.riskReward !== null;
  const rrrUnattractive = typeof levels?.riskReward?.rrr === "number" ? levels.riskReward.rrr < 1 : false;

  return {
    biasOk: biasOkB,
    biasOkA,
    trendOk,
    signalQualityOk,
    sentimentWeak,
    orderflowNegative,
    tbSoftDivergence,
    tbConflictHard,
    executionCritical,
    levelsOk,
    rrrUnattractive,
  };
}

function evaluateGoldSwing(context: PlaybookContext): PlaybookEvaluation {
  const flags = evaluateGoldSwingConditions(context);
  const rationale: string[] = [];
  const debugReasons: string[] = [];
  const { rings, signalQuality } = context;

  const baseFailures: Array<{ key: string; reason: string }> = [];
  if (!flags.biasOk) baseFailures.push({ key: "bias", reason: "Bias too weak (<70)" });
  if (!flags.trendOk) baseFailures.push({ key: "trend", reason: "Trend too weak (<50)" });
  if (!flags.signalQualityOk) baseFailures.push({ key: "signalQuality", reason: "Signal quality too low (<55)" });
  if (!flags.levelsOk) baseFailures.push({ key: "levels", reason: "Levels missing/invalid" });
  if (flags.executionCritical) baseFailures.push({ key: "event", reason: "Execution-critical event within 48h" });

  if (baseFailures.length > 0) {
    const reason = baseFailures[0].reason;
    debugReasons.push(`base:${baseFailures.map((f) => f.key).join("+")}`);
    return {
      setupGrade: "NO_TRADE",
      setupType: deriveSetupType(rings),
      gradeRationale: [],
      noTradeReason: reason,
      debugReason: debugReasons.join(";"),
    };
  }

  const hardKnockouts: string[] = [];
  if (flags.tbConflictHard && flags.orderflowNegative) hardKnockouts.push("tb_conflict+of_negative");
  if (!flags.signalQualityOk && typeof signalQuality?.score === "number" && signalQuality.score < SIGNAL_QUALITY_BASE)
    hardKnockouts.push("signal_quality_low");
  if (flags.rrrUnattractive) hardKnockouts.push("rrr_unattractive");

  if (hardKnockouts.length > 0) {
    return {
      setupGrade: "NO_TRADE",
      setupType: deriveSetupType(rings),
      gradeRationale: [],
      noTradeReason: `Hard knockout: ${hardKnockouts.join(", ")}`,
      debugReason: `hard:${hardKnockouts.join("+")}`,
    };
  }

  const softNegatives: string[] = [];
  if (flags.orderflowNegative) softNegatives.push("orderflow_negative");
  if (flags.tbSoftDivergence && !flags.tbConflictHard) softNegatives.push("trend_bias_divergence");
  if (flags.sentimentWeak) softNegatives.push("sentiment_weak");
  if (!flags.biasOkA) softNegatives.push("bias_below_A");

  rationale.push("Bias strong (>=70)");
  rationale.push("Trend supportive (>=50)");
  rationale.push("Signal quality ok (>=55)");
  rationale.push("Levels present");
  if (softNegatives.length === 0) {
    return {
      setupGrade: "A",
      setupType: deriveSetupType(rings),
      gradeRationale: rationale.slice(0, 3),
      debugReason: "grade:A",
    };
  }

  const downgradeReasons = softNegatives.map((r) =>
    r === "orderflow_negative"
      ? "Orderflow negative"
      : r === "trend_bias_divergence"
        ? "Trend/Bias divergence"
        : r === "bias_below_A"
          ? `Bias below A threshold (<${BIAS_MIN_A})`
          : "Sentiment weak",
  );
  return {
    setupGrade: "B",
    setupType: deriveSetupType(rings),
    gradeRationale: [`Downgraded: ${downgradeReasons.join(", ")}`].slice(0, 3),
    debugReason: `soft:${softNegatives.join("+")}`,
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
  // Previously this branch emitted "No default alignment" (see reports); we now derive a safe fallback
  // direction so downstream decision logic can treat it as a soft WATCH instead of a hard block.
  const derivedDirection = rings.biasScore >= 50 ? "LONG" : "SHORT";
  return {
    setupGrade: "NO_TRADE",
    setupType: deriveSetupType(rings),
    gradeRationale: [`Derived alignment ${derivedDirection}; bias/trend below defaults`],
    noTradeReason: `Alignment derived (${derivedDirection}) from bias/trend`,
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

// --- SPX Swing Playbook (Phase-0 monitoring) ---
const SPX_VOL_HARD_LABEL = "high";
const SPX_VOL_SOFT_LABEL = "medium";
const SPX_TREND_MIN = 60;
const SPX_BIAS_MIN = 70;
const SPX_SIGNAL_QUALITY_MIN = 55;
const SPX_CONFIRMATION_MIN = 55;

type SpxWatchSegment =
  | "WATCH_FAILS_REGIME_CONFIRMATION"
  | "WATCH_FAILS_VOLATILITY"
  | "WATCH_FAILS_PULLBACK_QUALITY"
  | "WATCH_FAILS_BIAS_ALIGNMENT"
  | "WATCH_RANGE_CONSTRUCTIVE"
  | "WATCH_OTHER";

function evaluateSpxSwing(context: PlaybookContext): PlaybookEvaluation {
  const { rings, signalQuality, levels } = context;
  const regime = deriveRegimeTag({
    rings: {
      ...rings,
      momentumScore: (context.orderflow?.score ?? null) as number | null,
    },
  } as unknown as Setup);

  const volatilityLabel =
    levels?.riskReward?.volatilityLabel ??
    (typeof levels?.riskReward?.riskPercent === "number" && levels.riskReward.riskPercent > 6 ? "high" : null);
  const volHard = volatilityLabel === SPX_VOL_HARD_LABEL;
  const volSoft = !volHard && volatilityLabel === SPX_VOL_SOFT_LABEL;

  if (volHard) {
    return {
      setupGrade: "NO_TRADE",
      setupType: deriveSetupType(rings),
      gradeRationale: [],
      noTradeReason: "High volatility (blocked)",
      debugReason: "spx:block_high_vol",
    };
  }

  const biasOk = rings.biasScore >= SPX_BIAS_MIN;
  const trendOk = rings.trendScore >= SPX_TREND_MIN;
  const sqOk = typeof signalQuality?.score === "number" ? signalQuality.score >= SPX_SIGNAL_QUALITY_MIN : false;
  const confirmationScore =
    typeof rings.orderflowScore === "number"
      ? rings.orderflowScore
      : typeof context.orderflow?.score === "number"
        ? context.orderflow.score
        : null;
  const confirmationOk = (confirmationScore ?? -Infinity) >= SPX_CONFIRMATION_MIN;

  const pullbackWeak =
    (typeof levels?.riskReward?.riskPercent === "number" && levels.riskReward.riskPercent > 6) ||
    (typeof levels?.riskReward?.rewardPercent === "number" && levels.riskReward.rewardPercent < 1.5);

  const rationale: string[] = [];
  const debugReasons: string[] = [];

  const assignWatch = (segment: SpxWatchSegment, reason: string): PlaybookEvaluation => ({
    setupGrade: "NO_TRADE",
    setupType: deriveSetupType(rings),
    gradeRationale: rationale.slice(0, 3),
    noTradeReason: reason,
    debugReason: `spx:${segment}`,
  });

  // Regime handling: TREND default WATCH unless all gates met; RANGE is always WATCH (never BLOCKED)
  if (regime === "MISSING") {
    debugReasons.push("regime:missing");
  } else if (regime === "RANGE") {
    return assignWatch("WATCH_RANGE_CONSTRUCTIVE", "Regime range/chop (trend confirmation missing)");
  }

  if (!biasOk) {
    return assignWatch("WATCH_FAILS_BIAS_ALIGNMENT", "Bias not aligned for trade");
  }

  if (volSoft) {
    return assignWatch("WATCH_FAILS_VOLATILITY", "Volatility elevated (soft gate)");
  }

  if (regime !== "TREND") {
    return assignWatch("WATCH_FAILS_REGIME_CONFIRMATION", "Regime not TREND");
  }

  if (!trendOk || !confirmationOk) {
    return assignWatch("WATCH_FAILS_REGIME_CONFIRMATION", "Trend/confirmation below threshold");
  }

  if (pullbackWeak) {
    return assignWatch("WATCH_FAILS_PULLBACK_QUALITY", "Pullback/structure quality insufficient");
  }

  if (!sqOk) {
    return assignWatch("WATCH_OTHER", "Signal quality below trade threshold (phase-0)");
  }

  rationale.push("Regime TREND", `Bias strong (>=${SPX_BIAS_MIN})`, `Trend strong (>=${SPX_TREND_MIN})`);
  rationale.push("Volatility ok", "Confirmation via orderflow", `Signal quality >= ${SPX_SIGNAL_QUALITY_MIN}`);

  return {
    setupGrade: "B",
    setupType: deriveSetupType(rings),
    gradeRationale: rationale.slice(0, 3),
    debugReason: debugReasons.concat("spx:trade").join(";"),
  };
}

const spxSwingPlaybook: Playbook = {
  id: SPX_PLAYBOOK_ID,
  label: "SPX Swing",
  shortLabel: "SPX",
  evaluateSetup: evaluateSpxSwing,
};

const daxSwingPlaybook: Playbook = {
  id: DAX_PLAYBOOK_ID,
  label: "DAX Swing",
  shortLabel: "DAX",
  evaluateSetup: evaluateSpxSwing,
};

const ndxSwingPlaybook: Playbook = {
  id: NDX_PLAYBOOK_ID,
  label: "NDX Swing",
  shortLabel: "NDX",
  evaluateSetup: evaluateSpxSwing,
};

function evaluateCryptoSwing(context: PlaybookContext): PlaybookEvaluation {
  const { rings, orderflow } = context;
  const biasOk = rings.biasScore >= 70;
  const trendOk = rings.trendScore >= 60;
  const confirmationScore =
    typeof rings.orderflowScore === "number" ? rings.orderflowScore : typeof orderflow?.score === "number" ? orderflow.score : null;
  const confirmationOk = (confirmationScore ?? -Infinity) >= 55;
  const regime = deriveRegimeTag({
    rings: { ...rings, momentumScore: (orderflow?.score ?? null) as number | null },
  } as unknown as Setup);

  if (regime !== "TREND") {
    return {
      setupGrade: "NO_TRADE",
      setupType: deriveSetupType(rings),
      gradeRationale: ["Regime range/chop (trend confirmation missing)"],
      noTradeReason: "Regime range/chop (trend confirmation missing)",
      debugReason: `regime:${regime}`,
    };
  }

  if (biasOk && trendOk && confirmationOk) {
    return {
      setupGrade: "B",
      setupType: deriveSetupType(rings),
      gradeRationale: ["Bias strong (>=70)", "Trend supportive (>=60)", "Confirmation via orderflow (>=55)"],
      debugReason: "regime:TREND",
    };
  }

  if (biasOk && trendOk && !confirmationOk) {
    return {
      setupGrade: "NO_TRADE",
      setupType: deriveSetupType(rings),
      gradeRationale: ["Chop/confirmation failed (orderflow <55)"],
      noTradeReason: "Chop/confirmation failed",
      debugReason: "confirmation_failed",
    };
  }

  // Fallback: alignment derived so decision layer can downgrade to WATCH instead of blocking.
  const derivedDirection = rings.biasScore >= 50 || rings.trendScore >= 50 ? "LONG" : "SHORT";
  return {
    setupGrade: "NO_TRADE",
    setupType: deriveSetupType(rings),
    gradeRationale: [`Derived alignment ${derivedDirection}; bias/trend below defaults`],
    noTradeReason: `Alignment derived (${derivedDirection}) from bias/trend`,
    debugReason: "alignment_fallback",
  };
}

const cryptoSwingPlaybook: Playbook = {
  id: CRYPTO_PLAYBOOK_ID,
  label: "Crypto Swing",
  shortLabel: "Crypto",
  evaluateSetup: evaluateCryptoSwing,
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
  [SPX_PLAYBOOK_ID]: { label: "SPX Swing", short: "SPX Swing" },
  [DAX_PLAYBOOK_ID]: { label: "DAX Swing", short: "DAX Swing" },
  [NDX_PLAYBOOK_ID]: { label: "NDX Swing", short: "NDX Swing" },
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
    if (playbookId === SPX_PLAYBOOK_ID) return "SPX Swing";
    if (playbookId === CRYPTO_PLAYBOOK_ID) return "Krypto Swing";
    if (playbookId === FX_PLAYBOOK_ID) return "FX Swing";
    if (playbookId === GENERIC_PLAYBOOK_ID) return "Generic Swing";
  }
  return meta.label;
}
