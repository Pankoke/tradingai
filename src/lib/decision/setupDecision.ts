import { watchEnabledPlaybookIds, hardReasonKeywords, softReasonKeywords, type SetupDecision, type SetupDecisionCategory } from "@/src/lib/config/watchDecision";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { deriveSpxWatchSegment } from "@/src/lib/decision/spxWatchSegment";

type SetupLike = Setup | HomepageSetup | (Setup & HomepageSetup) | (HomepageSetup & Setup);

export type DecisionResult = {
  decision: SetupDecision;
  category?: SetupDecisionCategory;
  reasons: string[];
  watchSegment?: string;
};

const MAX_REASONS = 3;

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
  const indexAssetIds = new Set(["spx", "sp500", "spx500", "dax", "ndx", "nasdaq"]);
  const isIndexAsset = assetClass === "index" || playbookId === "spx-swing-v0.1" || indexAssetIds.has(assetId);

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

  const deriveIndexAlignmentReason = (): string => {
    const trendFallback = trendScore !== null && trendScore >= 50;
    const biasFallback = biasScore !== null && biasScore >= 60;
    const fallbackDir = direction ?? (trendFallback || biasFallback ? "LONG" : "SHORT");
    return `Alignment derived (index fallback ${fallbackDir})`;
  };

  if (hasUpstream) {
    const upstream = upstreamDecision.toUpperCase();

    // Normalize reasons and ensure non-empty
    const normalizedReasons = upstreamReasons.length ? upstreamReasons.slice(0, MAX_REASONS) : [];
    const ensureReasons = (arr: string[], fallback: string) => (arr.length ? arr : [fallback]);
    const replaceAlignmentReasons = (reasons: string[], replacement: string) => {
      const mapped = reasons.map((r) => (r.toLowerCase().includes("no default alignment") ? replacement : r));
      const hasMapped = mapped.some((r) => r === replacement);
      if (!hasMapped) mapped.unshift(replacement);
      return mapped.slice(0, MAX_REASONS);
    };
    const maybeSegment =
      isIndexAsset && upstream !== "TRADE" ? deriveSpxWatchSegment(setup) : undefined;

    // If upstream blocked but no reasons -> downgrade to WATCH soft with explanation
    if (upstream === "BLOCKED") {
      const alignmentMention =
        normalizedReasons.some((r) => r.toLowerCase().includes("alignment")) ||
        (noTradeReason ?? "").toLowerCase().includes("alignment");
      if (isIndexAsset && alignmentMention) {
        const alignmentReason = deriveIndexAlignmentReason();
        const mergedReasons = ensureReasons(replaceAlignmentReasons(normalizedReasons, alignmentReason), alignmentReason);
        return { decision: "WATCH", category: "soft", reasons: mergedReasons, watchSegment: maybeSegment };
      }
      if (isIndexAsset && direction && !alignmentMention) {
        const alignmentReason = deriveIndexAlignmentReason();
        const mergedReasons = ensureReasons(replaceAlignmentReasons(normalizedReasons, alignmentReason), alignmentReason);
        return { decision: "WATCH", category: "soft", reasons: mergedReasons, watchSegment: maybeSegment };
      }
      // No reasons at all -> WATCH soft
      if (!normalizedReasons.length) {
        return {
          decision: "WATCH",
          category: "soft",
          reasons: ensureReasons(normalizedReasons, "Stream decision BLOCKED but no reasons (normalized to WATCH)"),
          watchSegment: maybeSegment,
        };
      }
      return { decision: "BLOCKED", category: "soft", reasons: ensureReasons(normalizedReasons, "Blocked (unspecified)") };
    }

    if (upstream === "WATCH") {
      const alignmentMention =
        normalizedReasons.some((r) => r.toLowerCase().includes("alignment")) ||
        (noTradeReason ?? "").toLowerCase().includes("alignment");
      if (isIndexAsset && alignmentMention) {
        const alignmentReason = deriveIndexAlignmentReason();
        return {
          decision: "WATCH",
          category: "soft",
          reasons: ensureReasons(replaceAlignmentReasons(normalizedReasons, alignmentReason), alignmentReason),
          watchSegment: maybeSegment,
        };
      }
      if (isIndexAsset && direction && !alignmentMention) {
        const alignmentReason = deriveIndexAlignmentReason();
        return {
          decision: "WATCH",
          category: "soft",
          reasons: ensureReasons(replaceAlignmentReasons(normalizedReasons, alignmentReason), alignmentReason),
          watchSegment: maybeSegment,
        };
      }
      return { decision: "WATCH", category: "soft", reasons: ensureReasons(normalizedReasons, "Watch (unspecified)"), watchSegment: maybeSegment };
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

  const reasons = buildReasons(noTradeReason, gradeRationale, gradeDebugReason);
  const ensureReasons = (arr: string[], fallback: string) => (arr.length ? arr : [fallback]);

  // BTC Swing: provide deterministic fallback alignment instead of hard-blocking on missing alignment
  // Source of "No default alignment" was the default playbook evaluation (crypto swing) when no alignment was resolved.
  // Here we derive a fallback direction so the decision becomes WATCH (soft) rather than BLOCKED.
  const isCryptoSwing = playbookId === "crypto-swing-v0.1";
  const alignmentMissing = (noTradeReason ?? "").toLowerCase().includes("alignment");
  if (isCryptoSwing && watchEnabled && !hard && (alignmentMissing || !noTradeReason)) {
    const directionRaw = (setup as { direction?: string | null }).direction ?? "";
    const direction =
      directionRaw.toLowerCase().includes("short") || directionRaw.toLowerCase().includes("sell")
        ? "SHORT"
        : directionRaw.toLowerCase().includes("long") || directionRaw.toLowerCase().includes("buy")
          ? "LONG"
          : null;
    const trendFallback = trendScore !== null && trendScore >= 50;
    const biasFallback = biasScore !== null && biasScore >= 70;
    const fallbackDir = direction ?? (trendFallback || biasFallback ? "LONG" : "SHORT");
    const alignmentReason = `Alignment derived (fallback ${fallbackDir})`;
    const mergedReasons = buildReasons(alignmentReason, gradeRationale, gradeDebugReason);
    return { decision: "WATCH", category: "soft", reasons: mergedReasons };
  }

  // Index (e.g. SPX) fallback alignment: avoid hard-blocking when alignment is missing
  if (isIndexAsset && watchEnabled && !hard && (alignmentMissing || direction)) {
    const trendFallback = trendScore !== null && trendScore >= 50;
    const biasFallback = biasScore !== null && biasScore >= 60;
    const fallbackDir = direction ?? (trendFallback || biasFallback ? "LONG" : "SHORT");
    const alignmentReason = `Alignment derived (index fallback ${fallbackDir})`;
    const mergedReasons = buildReasons(alignmentReason, gradeRationale, gradeDebugReason);
    const watchSegment = deriveSpxWatchSegment(setup);
    return { decision: "WATCH", category: "soft", reasons: mergedReasons, watchSegment };
  }

  if (!watchEnabled) {
    return { decision: "BLOCKED", category: hard ? "hard" : "soft", reasons: ensureReasons(reasons, "Blocked (unspecified)") };
  }

  if (!hard && soft) {
    const watchSegment = isIndexAsset ? deriveSpxWatchSegment(setup) : undefined;
    return { decision: "WATCH", category: "soft", reasons: ensureReasons(reasons, "Watch (unspecified)"), watchSegment };
  }

  return { decision: "BLOCKED", category: hard ? "hard" : "soft", reasons: ensureReasons(reasons, "Blocked (unspecified)") };
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
  if (decision === "WATCH") return 1;
  if (decision === "BLOCKED") return 2;
  return 3;
}
