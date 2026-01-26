import { watchEnabledPlaybookIds, hardReasonKeywords, softReasonKeywords, type SetupDecision, type SetupDecisionCategory } from "@/src/lib/config/watchDecision";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { deriveSpxWatchSegment } from "@/src/lib/decision/spxWatchSegment";
import { deriveFxWatchSegment } from "@/src/lib/decision/fxWatchSegment";
import { deriveFxAlignment, type FxAlignment } from "@/src/lib/decision/fxAlignment";

type SetupLike = Setup | HomepageSetup | (Setup & HomepageSetup) | (HomepageSetup & Setup);

export type DecisionResult = {
  decision: SetupDecision;
  category?: SetupDecisionCategory;
  reasons: string[];
  watchSegment?: string;
};

const MAX_REASONS = 3;

const fxAssetIds = new Set(["eurusd", "gbpusd", "usdjpy", "eurjpy", "audusd"]);
const cryptoAssetIds = new Set(["btc", "eth"]);
const indexAssetIds = new Set(["spx", "sp500", "spx500", "dax", "ndx", "nasdaq", "dow", "djia"]);

const ensureReasons = (arr: string[], fallback: string) => (arr.length ? arr : [fallback]);

const sanitizeFxReasons = (list: string[]): string[] => {
  const mapped = list.map((r) => {
    const lower = r.toLowerCase();
    if (lower.includes("no default alignment")) return "Alignment unavailable (fx)";
    if (lower.includes("alignment derived")) return "Alignment unavailable (fx)";
    if (lower.includes("index fallback")) return "Alignment unavailable (fx)";
    if (lower.includes("crypto hyphen usd")) return "";
    if (lower.includes("alignment unavailable (crypto)")) return "Alignment unavailable (fx)";
    return r;
  });
  return Array.from(new Set(mapped.filter((r) => r && r.trim().length > 0))).slice(0, MAX_REASONS);
};

const buildFxAlignmentReason = (alignment: FxAlignment | null): string => {
  if (alignment === "LONG") return "Alignment fx LONG";
  if (alignment === "SHORT") return "Alignment fx SHORT";
  if (alignment === "NEUTRAL") return "Alignment fx neutral";
  return "Alignment unavailable (fx)";
};

// NOTE: Decision logic must only run during snapshot build.
// DO NOT recompute decisions in UI/reporting layers. Read persisted fields instead.
export function deriveSetupDecision(setup: SetupLike): DecisionResult {
  const grade = (setup as { setupGrade?: string | null }).setupGrade ?? null;
  const playbookId = ((setup as { setupPlaybookId?: string | null }).setupPlaybookId ?? "").toLowerCase();
  const noTradeReason = (setup as { noTradeReason?: string | null }).noTradeReason ?? null;
  const gradeRationale = (setup as { gradeRationale?: string[] | null }).gradeRationale ?? [];
  const gradeDebugReason = (setup as { gradeDebugReason?: string | null }).gradeDebugReason ?? null;
  const biasScore = (setup as { biasScore?: number | null }).biasScore ?? null;
  const trendScore = (setup as { trendScore?: number | null }).trendScore ?? null;
  const assetClass =
    ((setup as { assetClass?: string | null }).assetClass ??
      (setup as { asset?: { assetClass?: string | null } | null }).asset?.assetClass ??
      "")?.toLowerCase();
  const assetId = ((setup as { assetId?: string | null }).assetId ?? "").toLowerCase();
  const isIndexAsset = assetClass === "index" || playbookId === "spx-swing-v0.1" || indexAssetIds.has(assetId);
  const isCryptoAsset = assetClass === "crypto" || playbookId === "crypto-swing-v0.1" || cryptoAssetIds.has(assetId);
  const isFxAsset = assetClass === "fx" || fxAssetIds.has(assetId) || playbookId === "fx-swing-v0.1";

  // Streamed setups (already carry a decision). Normalize to our decision layer and avoid empty reasons.
  const upstreamDecision = (setup as { setupDecision?: string | null }).setupDecision ?? null;
  const upstreamReasons = ((setup as { decisionReasons?: unknown }).decisionReasons as string[] | undefined) ?? [];
  const hasUpstream = typeof upstreamDecision === "string" && upstreamDecision.length > 0;
  const directionRaw = (setup as { direction?: string | null }).direction ?? "";
  const direction =
    directionRaw.toLowerCase().includes("short") || directionRaw.toLowerCase().includes("sell")
      ? "SHORT"
      : directionRaw.toLowerCase().includes("long") || directionRaw.toLowerCase().includes("buy")
        ? "LONG"
        : null;
  const fxAlignment: FxAlignment | null = isFxAsset ? deriveFxAlignment(setup) : null;

  const deriveIndexAlignmentReason = (): string => {
    const trendFallback = trendScore !== null && trendScore >= 50;
    const biasFallback = biasScore !== null && biasScore >= 60;
    const fallbackDir = direction ?? (trendFallback || biasFallback ? "LONG" : "SHORT");
    return `Alignment derived (index fallback ${fallbackDir})`;
  };
  const deriveCryptoAlignmentReason = (): string => "Alignment unavailable (crypto)";

  const prependSegment = (reasons: string[], segment?: string | null): string[] => {
    const list = [...reasons];
    if (segment && segment.trim().length > 0 && !list.includes(segment)) {
      list.unshift(segment);
    }
    return list.slice(0, MAX_REASONS);
  };

  if (hasUpstream) {
    const upstream = upstreamDecision.toUpperCase();

    // Normalize reasons and ensure non-empty
    const normalizedReasons = upstreamReasons.length
      ? upstreamReasons.filter((r) => typeof r === "string" && r.trim().length > 0).slice(0, MAX_REASONS)
      : [];
    const replaceAlignmentReasons = (reasons: string[], replacement: string) => {
      const mapped = reasons
        .map((r) => (r.toLowerCase().includes("alignment") ? replacement : r))
        .filter((r) => r && r.trim().length > 0);
      const hasMapped = mapped.some((r) => r === replacement);
      if (!hasMapped) mapped.unshift(replacement);
      return Array.from(new Set(mapped)).slice(0, MAX_REASONS);
    };
    const indexSegment = isIndexAsset && upstream !== "TRADE" ? deriveSpxWatchSegment(setup) : undefined;
    const fxSegment = isFxAsset && upstream !== "TRADE" ? deriveFxWatchSegment(setup) : undefined;
    const applyFxWatch = (alignmentMention: boolean): DecisionResult => {
      const alignmentReason = buildFxAlignmentReason(fxAlignment);
      const withSegment = prependSegment(
        alignmentMention ? replaceAlignmentReasons(normalizedReasons, alignmentReason) : normalizedReasons,
        fxSegment,
      );
      const sanitized = sanitizeFxReasons(ensureReasons(withSegment, alignmentReason));
      return { decision: "WATCH", category: "soft", reasons: sanitized, watchSegment: fxSegment };
    };

    // If upstream blocked but no reasons -> downgrade to WATCH soft with explanation
    if (upstream === "BLOCKED") {
      const alignmentMention =
        normalizedReasons.some((r) => r.toLowerCase().includes("alignment")) ||
        (noTradeReason ?? "").toLowerCase().includes("alignment");
      if (isFxAsset) {
        return applyFxWatch(alignmentMention);
      }
      if (isIndexAsset && (alignmentMention || direction)) {
        const alignmentReason = deriveIndexAlignmentReason();
        const mergedReasons = ensureReasons(
          prependSegment(replaceAlignmentReasons(normalizedReasons, alignmentReason), indexSegment),
          alignmentReason,
        );
        return { decision: "WATCH", category: "soft", reasons: mergedReasons, watchSegment: indexSegment };
      }
      if (isCryptoAsset && alignmentMention) {
        const alignmentReason = deriveCryptoAlignmentReason();
        const mergedReasons = ensureReasons(replaceAlignmentReasons(normalizedReasons, alignmentReason), alignmentReason);
        return { decision: "WATCH", category: "soft", reasons: mergedReasons, watchSegment: indexSegment };
      }
      if (isCryptoAsset && direction && !alignmentMention) {
        const alignmentReason = deriveCryptoAlignmentReason();
        const mergedReasons = ensureReasons(replaceAlignmentReasons(normalizedReasons, alignmentReason), alignmentReason);
        return { decision: "WATCH", category: "soft", reasons: mergedReasons, watchSegment: indexSegment };
      }
      // No reasons at all -> WATCH soft
      if (!normalizedReasons.length) {
        return {
          decision: "WATCH",
          category: "soft",
          reasons: ensureReasons(normalizedReasons, "Stream decision BLOCKED but no reasons (normalized to WATCH)"),
          watchSegment: indexSegment ?? fxSegment,
        };
      }
      return { decision: "BLOCKED", category: "soft", reasons: ensureReasons(normalizedReasons, "Blocked: missing decision reasons") };
    }

    if (upstream === "WATCH") {
      const alignmentMention =
        normalizedReasons.some((r) => r.toLowerCase().includes("alignment")) ||
        (noTradeReason ?? "").toLowerCase().includes("alignment");
      if (isFxAsset) {
        return applyFxWatch(alignmentMention);
      }
      if (isIndexAsset && (alignmentMention || direction)) {
        const alignmentReason = deriveIndexAlignmentReason();
        const withSegment = prependSegment(normalizedReasons, indexSegment);
        return {
          decision: "WATCH",
          category: "soft",
          reasons: ensureReasons(replaceAlignmentReasons(withSegment, alignmentReason), alignmentReason),
          watchSegment: indexSegment,
        };
      }
      if (isCryptoAsset && alignmentMention) {
        const alignmentReason = deriveCryptoAlignmentReason();
        return {
          decision: "WATCH",
          category: "soft",
          reasons: ensureReasons(replaceAlignmentReasons(normalizedReasons, alignmentReason), alignmentReason),
          watchSegment: indexSegment,
        };
      }
      const withSegment = prependSegment(normalizedReasons, indexSegment);
      return {
        decision: "WATCH",
        category: "soft",
        reasons: ensureReasons(withSegment, "Watch (unspecified)"),
        watchSegment: indexSegment,
      };
    }

    // Upstream TRADE or others: stay conservative unless we have strong grade A/B
    if (upstream === "TRADE" && (grade === "A" || grade === "B")) {
      return { decision: "TRADE", reasons: [] };
    }
    // Downgrade unknown upstream trade to WATCH to stay safe in Phase-0 monitoring
    return { decision: "WATCH", category: "soft", reasons: ensureReasons(normalizedReasons, "Stream decision TRADE normalized to WATCH") };
  }

  if (grade === "A" || grade === "B") {
    return { decision: "TRADE", reasons: [] };
  }

  const watchEnabled = watchEnabledPlaybookIds.has(playbookId);
  const hard = isHardKo(setup);
  const soft = !hard && isSoftReason(noTradeReason, gradeRationale);

  let reasons = buildReasons(noTradeReason, gradeRationale, gradeDebugReason);
  if (isFxAsset) {
    reasons = sanitizeFxReasons(reasons);
  }

  // BTC Swing: provide deterministic fallback alignment instead of hard-blocking on missing alignment
  // Source of "No default alignment" was the default playbook evaluation (crypto swing) when no alignment was resolved.
  // Here we derive a fallback direction so the decision becomes WATCH (soft) rather than BLOCKED.
  const isCryptoSwing = playbookId === "crypto-swing-v0.1";
  const alignmentMissing = (noTradeReason ?? "").toLowerCase().includes("alignment");
  if ((isCryptoSwing || isCryptoAsset) && watchEnabled && !hard && (alignmentMissing || !noTradeReason)) {
    const alignmentReason = deriveCryptoAlignmentReason();
    const mergedReasons = buildReasons(alignmentReason, gradeRationale, gradeDebugReason);
    return { decision: "WATCH", category: "soft", reasons: mergedReasons };
  }

  if (isFxAsset && watchEnabled && !hard && (alignmentMissing || !noTradeReason || fxAlignment !== null)) {
    const segment = deriveFxWatchSegment(setup);
    const alignmentReason = buildFxAlignmentReason(fxAlignment);
    const mergedReasons = prependSegment(buildReasons(alignmentReason, gradeRationale, gradeDebugReason), segment);
    const sanitized = sanitizeFxReasons(mergedReasons);
    return { decision: "WATCH", category: "soft", reasons: ensureReasons(sanitized, "Watch (unspecified)"), watchSegment: segment };
  }

  // Index (e.g. SPX) fallback alignment: avoid hard-blocking when alignment is missing
  if (isIndexAsset && watchEnabled && !hard && (alignmentMissing || direction)) {
    const trendFallback = trendScore !== null && trendScore >= 50;
    const biasFallback = biasScore !== null && biasScore >= 60;
    const fallbackDir = direction ?? (trendFallback || biasFallback ? "LONG" : "SHORT");
    const alignmentReason = `Alignment derived (index fallback ${fallbackDir})`;
    const watchSegment = deriveSpxWatchSegment(setup);
    const mergedReasons = prependSegment(
      buildReasons(alignmentReason, gradeRationale, gradeDebugReason),
      watchSegment,
    );
    return { decision: "WATCH", category: "soft", reasons: mergedReasons, watchSegment };
  }

  if (!watchEnabled) {
    return { decision: "BLOCKED", category: hard ? "hard" : "soft", reasons: ensureReasons(reasons, "Blocked: missing decision reasons") };
  }

  if (!hard && soft) {
    const watchSegment = isIndexAsset ? deriveSpxWatchSegment(setup) : isFxAsset ? deriveFxWatchSegment(setup) : undefined;
    let watchReasons = prependSegment(reasons, watchSegment);
    if (isFxAsset) {
      const alignmentReason = buildFxAlignmentReason(fxAlignment);
      watchReasons = sanitizeFxReasons(prependSegment(watchReasons, watchSegment));
      watchReasons = ensureReasons(watchReasons, alignmentReason);
    }
    return { decision: "WATCH", category: "soft", reasons: ensureReasons(watchReasons, "Watch (unspecified)"), watchSegment };
  }

  if (isFxAsset) {
    const alignmentReason = buildFxAlignmentReason(fxAlignment);
    const sanitized = sanitizeFxReasons(reasons);
    return {
      decision: "BLOCKED",
      category: hard ? "hard" : "soft",
      reasons: ensureReasons(sanitized, alignmentReason),
    };
  }

  return { decision: "BLOCKED", category: hard ? "hard" : "soft", reasons: ensureReasons(reasons, "Blocked: missing decision reasons") };
}

function buildReasons(noTradeReason: string | null, gradeRationale: string[] | null, debugReason: string | null): string[] {
  const reasons = [noTradeReason, ...(gradeRationale ?? []), debugReason].filter((v): v is string => Boolean(v?.trim()));
  const unique: string[] = [];
  for (const reason of reasons) {
    if (!unique.includes(reason)) unique.push(reason);
    if (unique.length >= MAX_REASONS) break;
  }
  return unique;
}

function isHardKo(setup: SetupLike): boolean {
  const validity = (setup as { validity?: { isStale?: boolean } | null }).validity;
  if (validity?.isStale) return true;

  const entryZone = (setup as { entryZone?: unknown }).entryZone;
  const stopLoss = (setup as { stopLoss?: unknown }).stopLoss;
  const takeProfit = (setup as { takeProfit?: unknown }).takeProfit;
  if (levelsMissing(entryZone, stopLoss, takeProfit)) return true;

  const eventModifier = (setup as { eventModifier?: { classification?: string | null } | null }).eventModifier;
  const classification = (eventModifier?.classification ?? "").toLowerCase();
  if (classification.includes("execution_critical") || classification.includes("blocked") || classification.includes("knockout")) {
    return true;
  }

  const textBlocks = collectTextBlocks(setup);
  return containsKeyword(textBlocks, hardReasonKeywords);
}

function isSoftReason(noTradeReason: string | null, gradeRationale?: string[] | null): boolean {
  const texts = [noTradeReason, ...(gradeRationale ?? [])].filter(Boolean) as string[];
  return containsKeyword(texts, softReasonKeywords);
}

function collectTextBlocks(setup: SetupLike): string[] {
  const noTradeReason = (setup as { noTradeReason?: string | null }).noTradeReason ?? "";
  const gradeRationale = (setup as { gradeRationale?: string[] | null }).gradeRationale ?? [];
  const gradeDebugReason = (setup as { gradeDebugReason?: string | null }).gradeDebugReason ?? "";
  return [noTradeReason, gradeDebugReason, ...gradeRationale].filter(Boolean) as string[];
}

function containsKeyword(texts: string[], keywords: string[]): boolean {
  const joined = texts.map((t) => t.toLowerCase());
  return joined.some((text) => keywords.some((kw) => text.includes(kw)));
}

function levelsMissing(
  entryZone: unknown,
  stopLoss: unknown,
  takeProfit: unknown,
): boolean {
  const entryMissing = normalizeRange(entryZone);
  const stopMissing = normalizeNumber(stopLoss);
  const takeMissing = normalizeNumber(takeProfit);
  return entryMissing || stopMissing || takeMissing;
}

function normalizeRange(value: unknown): boolean {
  if (typeof value === "string") {
    const matches = value.match(/-?\d+(\.\d+)?/g);
    if (!matches || matches.length === 0) return true;
    return matches.every((m) => !Number.isFinite(Number.parseFloat(m)));
  }
  if (value && typeof value === "object" && "from" in (value as Record<string, unknown>) && "to" in (value as Record<string, unknown>)) {
    const from = (value as { from?: number | null }).from;
    const to = (value as { to?: number | null }).to;
    return !(Number.isFinite(from ?? NaN) || Number.isFinite(to ?? NaN));
  }
  return true;
}

function normalizeNumber(value: unknown): boolean {
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return !Number.isFinite(parsed);
  }
  return true;
}

export function getDecisionOrder(decision: SetupDecision | null | undefined): number {
  if (decision === "TRADE") return 0;
  if (decision === "WATCH_PLUS") return 1;
  if (decision === "WATCH") return 2;
  if (decision === "BLOCKED") return 3;
  return 4;
}
