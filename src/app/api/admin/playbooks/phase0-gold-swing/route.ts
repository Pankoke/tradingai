import type { NextRequest } from "next/server";
import { db } from "@/src/server/db/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { gte, inArray } from "drizzle-orm";
import type { Setup } from "@/src/lib/engine/types";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { listOutcomesForWindow } from "@/src/server/repositories/setupOutcomeRepository";
import { getSnapshotById } from "@/src/server/repositories/perceptionSnapshotRepository";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";
import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";
import { deriveRegimeTag } from "@/src/lib/engine/metrics/regime";
import type { SetupDecision } from "@/src/lib/config/watchDecision";
import { deriveSpxWatchSegment } from "@/src/lib/decision/spxWatchSegment";

type GradeKey = "A" | "B" | "NO_TRADE";
type WatchSegmentKey =
  | "WATCH_MEETS_REQUIREMENTS"
  | "WATCH_FAILS_ONLY_CONFIDENCE"
  | "WATCH_FAILS_ONLY_SIGNAL_QUALITY"
  | "WATCH_FAILS_TREND"
  | "WATCH_FAILS_BIAS"
  | "WATCH_OTHER";
type SpxWatchSegmentKey =
  | "WATCH_FAILS_REGIME_CONFIRMATION"
  | "WATCH_FAILS_VOLATILITY"
  | "WATCH_FAILS_PULLBACK_QUALITY"
  | "WATCH_FAILS_BIAS_ALIGNMENT"
  | "WATCH_RANGE_CONSTRUCTIVE"
  | "WATCH_OTHER";

type BtcAlignmentStats = {
  total: number;
  reasons: Record<string, number>;
};

type BtcWatchSegmentKey = "WATCH_FAILS_REGIME" | "WATCH_FAILS_CONFIRMATION" | "WATCH_FAILS_TREND" | "WATCH_OTHER";
type RegimeTag = "TREND" | "RANGE" | "MISSING";
type AssetDiagnostics = {
  regimeDistribution?: Record<string, number>;
  volatilityBuckets?: Array<{ bucket: string; count: number }>;
  notes?: string[];
};

type AssetPhase0Summary = {
  meta: { assetId: string; timeframe: string; sampleWindowDays: number; labelsUsedCounts?: Record<string, number> };
  decisionDistribution: Record<SetupDecision, number>;
  gradeDistribution?: Record<GradeKey, number>;
  watchSegmentsDistribution?: Record<string, number>;
  upgradeCandidates?: { total: number; byReason?: Record<string, number> };
  regimeDistribution?: Record<string, number>;
  diagnostics?: AssetDiagnostics;
  blockedReasonsDistribution?: Record<string, number>;
  noTradeReasonsDistribution?: Record<string, number>;
  watchReasonsDistribution?: Record<string, number>;
};

type BtcLevelStats = {
  count: number;
  parseErrors: number;
  stopPcts: number[];
  targetPcts: number[];
  rrrs: number[];
};

function authCheck(request: Request): { ok: boolean; meta: Record<string, unknown> } {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const cronToken = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const bearer = header?.replace("Bearer", "").trim();
  const cookies = request.headers.get("cookie") ?? "";
  const clerkStatus = request.headers.get("x-clerk-auth-status");
  const alt = request.headers.get("x-cron-secret");
  const env = process.env.NODE_ENV;
  const isLocal = env === "development" || env === "test";
  const usedCron = !!cronToken && (bearer === cronToken || alt === cronToken);
  const sessionCookie =
    cookies.includes("__session=") || cookies.includes("__client_uat=") || cookies.includes("__clerk_session");
  const usedAdminToken = !!adminToken && bearer === adminToken;
  const usedSession = !!clerkStatus && clerkStatus !== "signed-out" ? true : sessionCookie;
  const usedAdmin = usedAdminToken || usedSession;

  if (adminToken) {
    return { ok: usedAdmin || usedCron, meta: { hasAdmin: true, hasCron: !!cronToken, usedAdmin, usedCron } };
  }
  if (isLocal && !adminToken) {
    return { ok: true, meta: { localMode: true, hasCron: !!cronToken, usedCron, usedAdmin } };
  }
  return { ok: usedCron, meta: { hasAdmin: false, hasCron: !!cronToken, usedCron, usedAdmin } };
}

function normalizeGrade(value: unknown): GradeKey {
  if (value === "A" || value === "B") return value;
  return "NO_TRADE";
}

function pct(count: number, total: number): number {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10; // one decimal
}

export async function GET(request: NextRequest): Promise<Response> {
  const auth = authCheck(request);
  if (!auth.ok) {
    const env = process.env.NODE_ENV;
    const details = env === "development" || env === "test" ? auth.meta : undefined;
    return respondFail("UNAUTHORIZED", "Unauthorized", 401, details);
  }

  const url = new URL(request.url);
  const daysBack = Number.parseInt(url.searchParams.get("daysBack") ?? "30", 10);
  const requestedAssetId = url.searchParams.get("assetId") ?? "gold";
  const canonicalAssetId = requestedAssetId.toLowerCase();
  const canonicalAssetIdUpper = canonicalAssetId.toUpperCase();
  const playbookId = url.searchParams.get("playbookId") ?? undefined;
  const windowFieldRaw = (url.searchParams.get("windowField") ?? "evaluatedAt").toLowerCase();
  const windowBasedOn = windowFieldRaw === "createdat" ? "createdAt" : windowFieldRaw === "outcomeat" ? "outcomeAt" : "evaluatedAt";
  const dedupeRaw = (url.searchParams.get("dedupeBy") ?? "").toLowerCase();
  const dedupeBy: "setupId" | "snapshotId" | null = dedupeRaw === "setupid" ? "setupId" : dedupeRaw === "snapshotid" ? "snapshotId" : "snapshotId";
  const effectiveDays = Number.isFinite(daysBack) && daysBack > 0 ? daysBack : 30;
  const from = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000);

  try {
    const rows = await db
      .select({
        setups: perceptionSnapshots.setups,
        snapshotTime: perceptionSnapshots.snapshotTime,
        createdAt: perceptionSnapshots.createdAt,
        label: perceptionSnapshots.label,
      })
      .from(perceptionSnapshots)
      .where(gte(perceptionSnapshots.snapshotTime, from));

    const matches: Setup[] = [];
    const biasBuckets: Record<string, { total: number; byGrade: Record<GradeKey, number>; noTradeReasons: Record<string, number> }> = {
      "<70": { total: 0, byGrade: { A: 0, B: 0, NO_TRADE: 0 }, noTradeReasons: {} },
      "70-79": { total: 0, byGrade: { A: 0, B: 0, NO_TRADE: 0 }, noTradeReasons: {} },
      ">=80": { total: 0, byGrade: { A: 0, B: 0, NO_TRADE: 0 }, noTradeReasons: {} },
    };
    let btcAlignmentReasonMapped = 0;
    let minCreated: Date | null = null;
    let maxCreated: Date | null = null;
    for (const row of rows) {
      const createdAt = (row as { createdAt?: Date | null }).createdAt ?? row.snapshotTime ?? null;
      if (createdAt) {
        if (!minCreated || createdAt < minCreated) minCreated = createdAt;
        if (!maxCreated || createdAt > maxCreated) maxCreated = createdAt;
      }
      const setups = Array.isArray(row.setups) ? (row.setups as Setup[]) : [];
      for (const setup of setups) {
        const assetId = (setup.assetId ?? setup.symbol ?? "").toUpperCase();
        const profile = (setup.profile ?? "").toUpperCase();
        const timeframe = (setup.timeframeUsed ?? setup.timeframe ?? "").toUpperCase();
        const setupPlaybookId = (setup.setupPlaybookId ?? "").toLowerCase();
        const matchesPlaybook = playbookId ? setupPlaybookId === playbookId.toLowerCase() : true;
        if (assetId === canonicalAssetIdUpper && profile === "SWING" && timeframe === "1D" && matchesPlaybook) {
          matches.push(setup);
          const bias = typeof setup.biasScore === "number" ? setup.biasScore : null;
          const bucketKey = bias == null ? null : bias < 70 ? "<70" : bias < 80 ? "70-79" : ">=80";
          if (bucketKey) {
            const b = biasBuckets[bucketKey];
            b.total += 1;
            const grade = normalizeGrade((setup as { setupGrade?: string | null }).setupGrade ?? null);
            b.byGrade[grade] += 1;
            let reason = normalizeText((setup as { noTradeReason?: unknown }).noTradeReason) ?? "n/a";
            if (canonicalAssetId === "btc") {
              const mapped = mapAlignmentReason(reason);
              if (mapped !== reason) btcAlignmentReasonMapped += 1;
              reason = mapped;
            }
            b.noTradeReasons[reason] = (b.noTradeReasons[reason] ?? 0) + 1;
          }
        }
      }
    }

    const total = matches.length;
    const gradeCounts: Record<GradeKey, number> = { A: 0, B: 0, NO_TRADE: 0 };
    const decisionCounts: Record<"TRADE" | "WATCH" | "BLOCKED", number> = { TRADE: 0, WATCH: 0, BLOCKED: 0 };
    const watchSegmentStats: Record<
      WatchSegmentKey,
      { count: number; sumBias: number; sumTrend: number; sumSQ: number; sumConf: number }
    > = {
      WATCH_MEETS_REQUIREMENTS: { count: 0, sumBias: 0, sumTrend: 0, sumSQ: 0, sumConf: 0 },
      WATCH_FAILS_ONLY_CONFIDENCE: { count: 0, sumBias: 0, sumTrend: 0, sumSQ: 0, sumConf: 0 },
      WATCH_FAILS_ONLY_SIGNAL_QUALITY: { count: 0, sumBias: 0, sumTrend: 0, sumSQ: 0, sumConf: 0 },
      WATCH_FAILS_TREND: { count: 0, sumBias: 0, sumTrend: 0, sumSQ: 0, sumConf: 0 },
      WATCH_FAILS_BIAS: { count: 0, sumBias: 0, sumTrend: 0, sumSQ: 0, sumConf: 0 },
      WATCH_OTHER: { count: 0, sumBias: 0, sumTrend: 0, sumSQ: 0, sumConf: 0 },
    };
    let watchTotal = 0;
    let watchFailsTrendTotal = 0;
    let upgradeCandidatesCount = 0;
    let upgradeCandidatesSumBias = 0;
    let upgradeCandidatesSumTrend = 0;
    let upgradeCandidatesSumSQ = 0;
    let upgradeCandidatesSumConf = 0;
    const btcAlignment: BtcAlignmentStats = { total: 0, reasons: {} };
    const btcLevels: BtcLevelStats = { count: 0, parseErrors: 0, stopPcts: [], targetPcts: [], rrrs: [] };
    let btcAlignmentDerived = 0;
    let btcAlignmentMissing = 0;
    const btcRegimeCounts: Record<RegimeTag, number> = { TREND: 0, RANGE: 0, MISSING: 0 };
    const btcRegimeForSetup = new Map<string, RegimeTag>();
    const btcWatchSegmentStats: Record<
      BtcWatchSegmentKey,
      { count: number; sumBias: number; sumTrend: number; sumOrderflow: number; sumConf: number }
    > = {
      WATCH_FAILS_REGIME: { count: 0, sumBias: 0, sumTrend: 0, sumOrderflow: 0, sumConf: 0 },
      WATCH_FAILS_CONFIRMATION: { count: 0, sumBias: 0, sumTrend: 0, sumOrderflow: 0, sumConf: 0 },
      WATCH_FAILS_TREND: { count: 0, sumBias: 0, sumTrend: 0, sumOrderflow: 0, sumConf: 0 },
      WATCH_OTHER: { count: 0, sumBias: 0, sumTrend: 0, sumOrderflow: 0, sumConf: 0 },
    };
    let btcWatchTotal = 0;
    let btcTradesAllowedTrend = 0;
    let btcTradesBlockedByRegime = 0;
    let staleCount = 0;
    let fallbackCount = 0;

    for (const setup of matches) {
      const grade = normalizeGrade((setup as { setupGrade?: string | null }).setupGrade ?? null);
      gradeCounts[grade] += 1;
      const decision = deriveSetupDecision(setup).decision;
      decisionCounts[decision] += 1;
      const validity = (setup as { validity?: { isStale?: boolean } | null }).validity;
      if (validity?.isStale) staleCount += 1;
      const dataSourcePrimary = (setup as { dataSourcePrimary?: string | null }).dataSourcePrimary;
      const dataSourceUsed = (setup as { dataSourceUsed?: string | null }).dataSourceUsed ?? dataSourcePrimary;
      if (dataSourcePrimary && dataSourceUsed && dataSourcePrimary !== dataSourceUsed) {
        fallbackCount += 1;
      }
      if (canonicalAssetId === "btc") {
        const regime = deriveRegimeTag(setup);
        btcRegimeCounts[regime] += 1;
        const key = `${(setup as { snapshotId?: string | null }).snapshotId ?? ""}|${setup.id}`;
        btcRegimeForSetup.set(key, regime);
        if (decision === "TRADE") {
          if (regime === "TREND") {
            btcTradesAllowedTrend += 1;
          } else {
            btcTradesBlockedByRegime += 1;
          }
        }
      }

      if (decision === "WATCH" && isGoldAsset(playbookId, canonicalAssetId)) {
        const scores = resolveScores(setup);
        const segment = classifyWatchSegment(scores);
        const bucket = watchSegmentStats[segment];
        bucket.count += 1;
        bucket.sumBias += scores.bias ?? 0;
        bucket.sumTrend += scores.trend ?? 0;
        bucket.sumSQ += scores.signalQuality ?? 0;
        bucket.sumConf += scores.confidence ?? 0;
        watchTotal += 1;
        if (segment === "WATCH_FAILS_TREND") {
          watchFailsTrendTotal += 1;
          if (isUpgradeCandidate(setup, scores)) {
            upgradeCandidatesCount += 1;
            upgradeCandidatesSumBias += scores.bias ?? 0;
            upgradeCandidatesSumTrend += scores.trend ?? 0;
            upgradeCandidatesSumSQ += scores.signalQuality ?? 0;
            upgradeCandidatesSumConf += scores.confidence ?? 0;
          }
        }
      } else if (canonicalAssetId === "btc" && decision === "WATCH") {
        const scores = resolveScores(setup);
        const regime = deriveRegimeTag(setup);
        const orderflowScore =
          typeof setup.rings?.orderflowScore === "number"
            ? setup.rings.orderflowScore
            : typeof (setup as { orderflowScore?: number | null }).orderflowScore === "number"
              ? ((setup as { orderflowScore?: number | null }).orderflowScore as number)
              : null;
        const trendOk = (scores.trend ?? -Infinity) >= 60;
        const confirmationOk = (orderflowScore ?? -Infinity) >= 55;
        const segment: BtcWatchSegmentKey =
          regime !== "TREND"
            ? "WATCH_FAILS_REGIME"
            : !trendOk
              ? "WATCH_FAILS_TREND"
              : confirmationOk
                ? "WATCH_OTHER"
                : "WATCH_FAILS_CONFIRMATION";
        const bucket = btcWatchSegmentStats[segment];
        bucket.count += 1;
        bucket.sumBias += scores.bias ?? 0;
        bucket.sumTrend += scores.trend ?? 0;
        bucket.sumOrderflow += orderflowScore ?? 0;
        bucket.sumConf += scores.confidence ?? 0;
        btcWatchTotal += 1;
      }
      if (canonicalAssetId === "btc" && (decision === "BLOCKED" || decision === "WATCH")) {
        const reasonRaw = (setup as { noTradeReason?: unknown }).noTradeReason;
        const reasonNormalized = normalizeText(reasonRaw);
        let reason = reasonNormalized ?? "unknown";
        const reasonLc = reason.toLowerCase();
        if (reasonLc.includes("alignment") && reasonLc.includes("default")) {
          reason = "Alignment derived (fallback)";
          btcAlignmentDerived += 1;
        } else if (reasonLc.includes("alignment derived")) {
          btcAlignmentDerived += 1;
        } else if (reasonLc.includes("alignment")) {
          btcAlignmentMissing += 1;
        }
        const key = reason.length ? reason : "unknown";
        btcAlignment.total += 1;
        btcAlignment.reasons[key] = (btcAlignment.reasons[key] ?? 0) + 1;
      } else if (canonicalAssetId === "btc" && decision === "TRADE") {
        const plausibility = parseLevelPlausibility(setup);
        if (plausibility.parseError) {
          btcLevels.parseErrors += 1;
        } else {
          if (plausibility.stopPct != null) btcLevels.stopPcts.push(plausibility.stopPct);
          if (plausibility.targetPct != null) btcLevels.targetPcts.push(plausibility.targetPct);
          if (plausibility.rrr != null) btcLevels.rrrs.push(plausibility.rrr);
          btcLevels.count += 1;
        }
      }
    }

    // Outcomes summary
    const outcomesQuery = {
      from: windowBasedOn === "evaluatedAt" ? from : undefined,
      cohortFromSnapshot: windowBasedOn === "createdAt" ? from : undefined,
      assetId: canonicalAssetId,
      profile: "SWING",
      timeframe: "1D",
      mode: "all" as const,
      limit: 5000,
      playbookId,
    };
    const outcomesRaw = await listOutcomesForWindow(outcomesQuery);
    const filteredByOutcomeAt =
      windowBasedOn === "outcomeAt"
        ? outcomesRaw.filter((o) => {
            const outcomeAt = (o as { outcomeAt?: Date | null }).outcomeAt;
            return outcomeAt ? outcomeAt >= from : false;
          })
        : outcomesRaw;
    const outcomes =
      dedupeBy === "setupId"
        ? dedupeBySetupId(filteredByOutcomeAt)
        : dedupeBy === "snapshotId"
          ? dedupeBySnapshotId(filteredByOutcomeAt)
          : filteredByOutcomeAt;
    const outcomeGrades: Record<GradeKey, Record<string, number>> = {
      A: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      B: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      NO_TRADE: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
    };

    const snapshotCache = new Map<string, Setup[]>();
    const snapshotIds = Array.from(
      new Set(
        outcomes
          .map((o) => (o as { snapshotId?: string | null }).snapshotId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    if (snapshotIds.length) {
      const snapshotRows = await db
        .select({ id: perceptionSnapshots.id, setups: perceptionSnapshots.setups })
        .from(perceptionSnapshots)
        .where(inArray(perceptionSnapshots.id, snapshotIds));
      snapshotRows.forEach((row) => {
        const setups = (row.setups as Setup[] | undefined) ?? [];
        snapshotCache.set(row.id, setups);
      });
    }
    let outcomesWithGrade = 0;
    let outcomesMissingGrade = 0;
    let outcomesWithMultipleMatches = 0;
    let signalQualityMissing = 0;
    let signalQualityTotal = 0;
    const outcomesDecisionBuckets: Record<"TRADE" | "WATCH" | "BLOCKED", Record<string, number>> = {
      TRADE: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      WATCH: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      BLOCKED: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
    };
    const outcomesBtcDirectionBuckets: Record<string, Record<string, number>> = {
      LONG: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      SHORT: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      UNKNOWN: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
    };
    const outcomesBtcTrendBuckets: Record<string, Record<string, number>> = {
      "<40": { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      "40-49": { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      "50-59": { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      ">=60": { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
    };
    const outcomesBtcVolBuckets: Record<string, Record<string, number>> = {
      LOW: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      MED: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      HIGH: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      MISSING: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
    };
    const watchUpgradeCandidateOutcomes: Record<string, number> = { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 };
    const watchSegmentOutcomes: Record<WatchSegmentKey, Record<string, number>> = {
      WATCH_MEETS_REQUIREMENTS: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      WATCH_FAILS_ONLY_CONFIDENCE: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      WATCH_FAILS_ONLY_SIGNAL_QUALITY: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      WATCH_FAILS_TREND: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      WATCH_FAILS_BIAS: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      WATCH_OTHER: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
    };
    let watchOutcomeTradeHits = 0;
    let watchOutcomeTotal = 0;
    let outcomesMappedToDecision = 0;
    let outcomesMissingSnapshot = 0;
    let outcomesMissingSetupInSnapshot = 0;

    for (const outcome of outcomes) {
      const snapshotId = (outcome as { snapshotId?: string | null }).snapshotId;
      const setupId = (outcome as { setupId?: string | null }).setupId;
      const gradeSource = (outcome as { setupGrade?: string | null }).setupGrade;
      const resolvedGrade = await resolveGradeFromSnapshot({
        grade: gradeSource,
        snapshotId,
        setupId,
        snapshotCache,
      });
      if (resolvedGrade.sourceCount > 1) {
        outcomesWithMultipleMatches += 1;
      }
      if (resolvedGrade.grade) {
        outcomesWithGrade += 1;
      } else {
        outcomesMissingGrade += 1;
      }
      const grade = normalizeGrade(resolvedGrade.grade ?? null);
      const bucket = outcomeGrades[grade];
      const status = (outcome as { outcomeStatus?: string }).outcomeStatus ?? "open";
      if (bucket[status] !== undefined) {
        bucket[status] += 1;
      }
      const decisionFromOutcome = deriveOutcomeDecision(resolvedGrade.grade, outcome, snapshotCache, snapshotId, setupId);
      if (!snapshotId || !snapshotCache.has(snapshotId)) {
        outcomesMissingSnapshot += 1;
      } else if (snapshotId && setupId) {
        const setups = snapshotCache.get(snapshotId) ?? [];
        const found = setups.find((s) => s.id === setupId);
        if (!found) outcomesMissingSetupInSnapshot += 1;
      }
      outcomesMappedToDecision += 1;
      const decisionBucket = outcomesDecisionBuckets[decisionFromOutcome] ?? outcomesDecisionBuckets.BLOCKED;
      if (decisionBucket[status] !== undefined) {
        decisionBucket[status] += 1;
      }
      if (decisionFromOutcome === "TRADE" && snapshotId && setupId) {
        const setups = snapshotCache.get(snapshotId) ?? [];
        const setup = setups.find((s) => s.id === setupId);
        if (setup) {
          const assetId = (setup.assetId ?? setup.symbol ?? "").toLowerCase();
          if (assetId === "btc") {
            const directionRaw = ((setup as { direction?: string | null }).direction ?? "").toLowerCase();
            const directionKey = directionRaw.includes("short")
              ? "SHORT"
              : directionRaw.includes("long")
                ? "LONG"
                : "UNKNOWN";
            const dirBucket = outcomesBtcDirectionBuckets[directionKey] ?? outcomesBtcDirectionBuckets.UNKNOWN;
            if (dirBucket[status] !== undefined) dirBucket[status] += 1;

            const trendScoreVal =
              typeof (setup as { trendScore?: number | null }).trendScore === "number"
                ? (setup as { trendScore?: number | null }).trendScore
                : typeof setup.rings?.trendScore === "number"
                  ? setup.rings.trendScore
                  : null;
            const trendScore: number | null = trendScoreVal ?? null;
            let trendKey = "<40";
            if (trendScore !== null) {
              if (trendScore >= 60) trendKey = ">=60";
              else if (trendScore >= 50) trendKey = "50-59";
              else if (trendScore >= 40) trendKey = "40-49";
            }
            const trendBucket = outcomesBtcTrendBuckets[trendKey] ?? outcomesBtcTrendBuckets["<40"];
            if (trendBucket[status] !== undefined) trendBucket[status] += 1;

            const volLabel =
              (((setup as { riskReward?: { volatilityLabel?: string | null } | null }).riskReward?.volatilityLabel ??
                (setup as { volatilityLabel?: string | null }).volatilityLabel) ??
                "")
                .toString()
                .toUpperCase();
            const volKey = volLabel === "LOW" || volLabel === "MED" || volLabel === "HIGH" ? volLabel : "MISSING";
            const volBucket = outcomesBtcVolBuckets[volKey] ?? outcomesBtcVolBuckets.MISSING;
            if (volBucket[status] !== undefined) volBucket[status] += 1;
          }
        }
      }
      if (decisionFromOutcome === "WATCH") {
        watchOutcomeTotal += 1;
        if (status === "hit_tp" || status === "hit_sl") watchOutcomeTradeHits += 1;
        if (isGoldAsset(playbookId, canonicalAssetId)) {
          const segment = resolveOutcomeWatchSegment(snapshotCache, snapshotId, setupId);
          const segBucket = watchSegmentOutcomes[segment] ?? watchSegmentOutcomes.WATCH_OTHER;
          if (segBucket[status] !== undefined) {
            segBucket[status] += 1;
          }
          const setups = snapshotCache.get(snapshotId ?? "") ?? [];
          const setup = setups.find((s) => s.id === setupId);
          if (segment === "WATCH_FAILS_TREND" && setup) {
            const scores = resolveScores(setup);
            if (isUpgradeCandidate(setup, scores)) {
              if (watchUpgradeCandidateOutcomes[status] !== undefined) {
                watchUpgradeCandidateOutcomes[status] += 1;
              }
            }
          }
        }
      }

      // signalQuality coverage
      signalQualityTotal += 1;
      let signalQuality: number | null | undefined = null;
      if (snapshotId && setupId) {
        let setups = snapshotCache.get(snapshotId);
        if (!setups) {
          const snapshot = await getSnapshotById(snapshotId);
          setups = (snapshot?.setups as Setup[] | undefined) ?? [];
          snapshotCache.set(snapshotId, setups);
        }
        const setup = setups.find((s) => s.id === setupId);
        if (setup) {
          signalQuality = (setup as { signalQuality?: number | null }).signalQuality;
          if (signalQuality == null && setup.rings) {
            const computed = computeSignalQuality(setup);
            signalQuality = computed?.score ?? null;
          }
        }
      }
      if (signalQuality == null) {
        signalQualityMissing += 1;
      }
    }

    const outcomesSummaryByGrade = (grade: GradeKey) => {
      const bucket = outcomeGrades[grade];
      const evaluatedCount = bucket.hit_tp + bucket.hit_sl;
      const winRateTpVsSl = evaluatedCount > 0 ? bucket.hit_tp / evaluatedCount : 0;
      return { ...bucket, evaluatedCount, winRateTpVsSl };
    };

    const playbooksSeen = Array.from(
      new Set(
        outcomes
          .map((o) => (o as { playbookId?: string | null }).playbookId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const signalQualityCoverage = {
      missingCount: signalQualityMissing,
      totalCount: signalQualityTotal,
      pctMissing: pct(signalQualityMissing, signalQualityTotal),
    };

    const decisionDistribution = {
      total,
      TRADE: { count: decisionCounts.TRADE, pct: pct(decisionCounts.TRADE, total) },
      WATCH: { count: decisionCounts.WATCH, pct: pct(decisionCounts.WATCH, total) },
      BLOCKED: { count: decisionCounts.BLOCKED, pct: pct(decisionCounts.BLOCKED, total) },
    };
    const btcRegimeTotal = btcRegimeCounts.TREND + btcRegimeCounts.RANGE + btcRegimeCounts.MISSING;
    const btcRegimeDistribution =
      canonicalAssetId === "btc"
        ? {
            TREND: { count: btcRegimeCounts.TREND, pct: pct(btcRegimeCounts.TREND, btcRegimeTotal || 1) },
            RANGE: { count: btcRegimeCounts.RANGE, pct: pct(btcRegimeCounts.RANGE, btcRegimeTotal || 1) },
            MISSING: { count: btcRegimeCounts.MISSING, pct: pct(btcRegimeCounts.MISSING, btcRegimeTotal || 1) },
            total: btcRegimeTotal,
          }
        : null;

    const outcomesSummaryByDecision = mapDecisionOutcomes(outcomesDecisionBuckets);
    const watchToTradeProxy =
      watchOutcomeTotal > 0 ? { count: watchOutcomeTradeHits, total: watchOutcomeTotal, pct: pct(watchOutcomeTradeHits, watchOutcomeTotal) } : null;
    const watchSegments =
      isGoldAsset(playbookId, canonicalAssetId) && watchTotal > 0
        ? mapWatchSegments(watchSegmentStats, watchTotal)
        : null;
    const btcWatchSegments =
      canonicalAssetId === "btc" && btcWatchTotal > 0 ? mapBtcWatchSegments(btcWatchSegmentStats, btcWatchTotal) : null;
    const outcomesByWatchSegment =
      isGoldAsset(playbookId, canonicalAssetId) && watchOutcomeTotal > 0
        ? mapWatchOutcomeBuckets(watchSegmentOutcomes)
        : null;
    const outcomesByWatchUpgradeCandidate =
      isGoldAsset(playbookId, canonicalAssetId) && watchOutcomeTotal > 0
        ? mapDecisionOutcomes({ TRADE: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 }, WATCH: watchUpgradeCandidateOutcomes, BLOCKED: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 } }).WATCH
        : null;
    const outcomesByBtcTradeRrrBucketRaw =
      canonicalAssetId === "btc"
        ? bucketBtcRrrOutcomes(snapshotCache, outcomes, canonicalAssetId, outcomesDecisionBuckets)
        : { buckets: null, debug: { rrrBucketTotalOutcomes: 0, rrrBucketDecisionMismatchSkipped: 0, rrrBucketUnbucketableSkipped: 0 } };
    const outcomesByBtcTradeRrrBucket = outcomesByBtcTradeRrrBucketRaw?.buckets ?? null;
    const rrrBucketDebug = outcomesByBtcTradeRrrBucketRaw?.debug ?? { rrrBucketTotalOutcomes: 0, rrrBucketDecisionMismatchSkipped: 0, rrrBucketUnbucketableSkipped: 0 };
    const outcomesByBtcTradeDirection =
      canonicalAssetId === "btc" ? mapGenericOutcomeBuckets(outcomesBtcDirectionBuckets) : null;
    const outcomesByBtcTradeTrendBucket =
      canonicalAssetId === "btc" ? mapGenericOutcomeBuckets(outcomesBtcTrendBuckets) : null;
    const outcomesByBtcTradeVolBucket =
      canonicalAssetId === "btc" ? mapGenericOutcomeBuckets(outcomesBtcVolBuckets) : null;
    const outcomeRegimeBuckets: Record<RegimeTag, Record<string, number>> = {
      TREND: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      RANGE: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      MISSING: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
    };
    if (canonicalAssetId === "btc") {
      for (const outcome of outcomes) {
        const snapshotId = (outcome as { snapshotId?: string | null }).snapshotId;
        const setupId = (outcome as { setupId?: string | null }).setupId;
        const key = `${snapshotId ?? ""}|${setupId ?? ""}`;
        let regime = btcRegimeForSetup.get(key);
        if (!regime && snapshotId && setupId) {
          const setups = snapshotCache.get(snapshotId);
          const setup = setups?.find((s) => s.id === setupId);
          if (setup) {
            regime = deriveRegimeTag(setup);
          }
        }
        const decision = deriveOutcomeDecision(
          (outcome as { grade?: string | null }).grade ?? null,
          outcome,
          snapshotCache,
          snapshotId,
          setupId,
        );
        if (decision !== "TRADE") continue;
        const bucket = outcomeRegimeBuckets[regime ?? "MISSING"];
        const status = (outcome as { status?: string | null }).status ?? "";
        if (status === "hit_tp") bucket.hit_tp = (bucket.hit_tp ?? 0) + 1;
        else if (status === "hit_sl") bucket.hit_sl = (bucket.hit_sl ?? 0) + 1;
        else if (status === "expired") bucket.expired = (bucket.expired ?? 0) + 1;
        else if (status === "ambiguous") bucket.ambiguous = (bucket.ambiguous ?? 0) + 1;
        else bucket.open = (bucket.open ?? 0) + 1;
      }
    }
    let remappedBiasBuckets = biasBuckets;
    if (canonicalAssetId === "btc") {
      const { buckets, mappedCount } = remapBtcBiasReasons(biasBuckets);
      remappedBiasBuckets = buckets;
      btcAlignmentReasonMapped += mappedCount;
    }

    const summariesAssetIds = ["gold", "btc", "spx"];
    const summaries = Object.fromEntries(
      summariesAssetIds.map((asset) => [
        asset,
        buildPhase0SummaryForAsset({
          rows,
          assetId: asset,
          sampleWindowDays: effectiveDays,
          playbookId: asset === canonicalAssetId ? playbookId ?? undefined : undefined,
        }),
      ]),
    );

    return respondOk({
      meta: { assetId: canonicalAssetIdUpper, profile: "SWING", timeframe: "1D", daysBack: effectiveDays },
      gradeDistribution: {
        total,
        A: { count: gradeCounts.A, pct: pct(gradeCounts.A, total) },
        B: { count: gradeCounts.B, pct: pct(gradeCounts.B, total) },
        NO_TRADE: { count: gradeCounts.NO_TRADE, pct: pct(gradeCounts.NO_TRADE, total) },
      },
      stale: { count: staleCount, pct: pct(staleCount, total) },
      fallback: { count: fallbackCount, pct: pct(fallbackCount, total) },
      outcomesSummaryByGrade: {
        A: outcomesSummaryByGrade("A"),
        B: outcomesSummaryByGrade("B"),
        NO_TRADE: outcomesSummaryByGrade("NO_TRADE"),
      },
      signalQualityCoverage,
      decisionDistribution,
      outcomesByDecision: outcomesSummaryByDecision,
      watchToTradeProxy,
      outcomesByWatchSegment,
      outcomesByWatchUpgradeCandidate,
      btcWatchSegments,
      outcomesByBtcTradeDirection,
      outcomesByBtcTradeTrendBucket,
      outcomesByBtcTradeVolBucket,
      outcomesByBtcTradeRrrBucket,
      outcomesByBtcRegime:
        canonicalAssetId === "btc"
          ? {
              TREND: mapOutcomeBucket(outcomeRegimeBuckets.TREND),
              RANGE: mapOutcomeBucket(outcomeRegimeBuckets.RANGE),
              MISSING: mapOutcomeBucket(outcomeRegimeBuckets.MISSING),
            }
          : null,
      debugMeta: {
        btcRegimeDistribution,
        outcomesQuery: {
          daysBack: effectiveDays,
          windowBasedOn,
          playbookIdsUsed: playbookId ? [playbookId] : playbooksSeen,
          requestedAssetId,
          canonicalAssetIdUsed: canonicalAssetId,
          assetIdsUsed: [canonicalAssetId],
          profileUsed: "SWING",
          timeframeUsed: "1D",
          dedupeBy: dedupeBy ?? undefined,
        },
        outcomesFetched: {
          totalRows: outcomes.length,
          distinctSetupIds: new Set(
            outcomes
              .map((o) => (o as { setupId?: string | null }).setupId)
              .filter((id): id is string => Boolean(id)),
          ).size,
          distinctSnapshotIds: new Set(
            outcomes
              .map((o) => (o as { snapshotId?: string | null }).snapshotId)
              .filter((id): id is string => Boolean(id)),
          ).size,
        },
        joinQuality: {
          outcomesWithGrade,
          outcomesMissingGrade,
          outcomesWithMultipleMatches,
        },
        watchSegments,
        watchUpgradeCandidates:
          isGoldAsset(playbookId, canonicalAssetId) && watchFailsTrendTotal > 0
            ? {
                definition: {
                  segment: "WATCH_FAILS_TREND",
                  minBias: 65,
                  minSignalQuality: 55,
                  minConfidence: 55,
                  requireNonStale: true,
                  excludeHardKnockout: true,
                },
                totalWatchFailsTrend: watchFailsTrendTotal,
                candidatesCount: upgradeCandidatesCount,
                candidatesPctOfWatchFailsTrend: pct(upgradeCandidatesCount, watchFailsTrendTotal),
                avgBias: upgradeCandidatesCount ? Math.round((upgradeCandidatesSumBias / upgradeCandidatesCount) * 10) / 10 : null,
                avgTrend: upgradeCandidatesCount ? Math.round((upgradeCandidatesSumTrend / upgradeCandidatesCount) * 10) / 10 : null,
                avgSignalQuality: upgradeCandidatesCount ? Math.round((upgradeCandidatesSumSQ / upgradeCandidatesCount) * 10) / 10 : null,
                avgConfidence: upgradeCandidatesCount ? Math.round((upgradeCandidatesSumConf / upgradeCandidatesCount) * 10) / 10 : null,
              }
            : null,
        btcAlignmentBreakdown: canonicalAssetId === "btc" ? topReasonsWithPct(btcAlignment) : null,
        btcAlignmentCounters:
          canonicalAssetId === "btc"
            ? {
                alignmentResolvedCount: Math.max(btcAlignment.total - btcAlignmentMissing, 0),
                alignmentDerivedCount: btcAlignmentDerived,
                alignmentStillMissingCount: btcAlignmentMissing,
                derived: btcAlignmentDerived,
                missing: btcAlignmentMissing,
                resolved: Math.max(btcAlignment.total - btcAlignmentMissing, 0),
                total: btcAlignment.total,
                mapped: btcAlignmentReasonMapped,
              }
            : null,
        btcWatchSegments: canonicalAssetId === "btc" ? btcWatchSegments : null,
        btcTrendOnlyGate:
          canonicalAssetId === "btc"
            ? {
                totalSetups: decisionCounts.TRADE + decisionCounts.WATCH + decisionCounts.BLOCKED,
                trendRegimeCount: btcRegimeCounts.TREND,
                nonTrendRegimeCount: btcRegimeCounts.RANGE + btcRegimeCounts.MISSING,
                tradesAllowed: btcTradesAllowedTrend,
                tradesBlockedByRegime: btcTradesBlockedByRegime,
              }
            : null,
        btcRrrBucketsDebug: canonicalAssetId === "btc" ? rrrBucketDebug : null,
        btcLevelPlausibility: canonicalAssetId === "btc" ? summarizeLevelPlausibility(btcLevels) : null,
        decisions: {
          setupsCount: decisionDistribution.total,
          outcomesCount: outcomes.length,
          outcomesMappedToDecision,
          outcomesMissingSnapshot,
          outcomesMissingSetupInSnapshot,
          outcomesDecisionBreakdown: {
            TRADE: outcomesDecisionBuckets.TRADE,
            WATCH: outcomesDecisionBuckets.WATCH,
            BLOCKED: outcomesDecisionBuckets.BLOCKED,
          },
        },
        biasHistogram: remappedBiasBuckets,
        cohortTimeRange: {
          snapshotTimeMin: minCreated ? minCreated.toISOString() : null,
          snapshotTimeMax: maxCreated ? maxCreated.toISOString() : null,
        },
      },
      summaries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return respondFail("INTERNAL_ERROR", message, 500);
  }
}

function dedupeBySetupId(outcomes: unknown[]) {
  const seen = new Set<string>();
  const result: typeof outcomes = [];
  for (const outcome of outcomes) {
    const setupId = (outcome as { setupId?: string | null }).setupId;
    if (!setupId) {
      result.push(outcome);
      continue;
    }
    if (seen.has(setupId)) continue;
    seen.add(setupId);
    result.push(outcome);
  }
  return result;
}

function dedupeBySnapshotId(outcomes: unknown[]) {
  const seen = new Set<string>();
  const result: typeof outcomes = [];
  for (const outcome of outcomes) {
    const snapshotId = (outcome as { snapshotId?: string | null }).snapshotId;
    if (!snapshotId) {
      result.push(outcome);
      continue;
    }
    if (seen.has(snapshotId)) continue;
    seen.add(snapshotId);
    result.push(outcome);
  }
  return result;
}

async function resolveGradeFromSnapshot(params: {
  grade?: string | null;
  snapshotId?: string | null;
  setupId?: string | null;
  snapshotCache: Map<string, Setup[]>;
}): Promise<{ grade: string | null; sourceCount: number }> {
  if (params.grade) {
    return { grade: params.grade, sourceCount: 1 };
  }
  const snapshotId = params.snapshotId;
  const setupId = params.setupId;
  if (!snapshotId || !setupId) return { grade: null, sourceCount: 0 };

  let setups = params.snapshotCache.get(snapshotId);
  if (!setups) {
    const snapshot = await getSnapshotById(snapshotId);
    setups = (snapshot?.setups as Setup[] | undefined) ?? [];
    params.snapshotCache.set(snapshotId, setups);
  }
  const matches = setups.filter((s) => s.id === setupId);
  if (!matches.length) {
    return { grade: null, sourceCount: 0 };
  }
  return { grade: matches[0].setupGrade ?? null, sourceCount: matches.length };
}

function deriveOutcomeDecision(
  grade: string | null,
  outcome: unknown,
  snapshotCache: Map<string, Setup[]>,
  snapshotId?: string | null,
  setupId?: string | null,
): "TRADE" | "WATCH" | "BLOCKED" {
  if (grade === "A" || grade === "B") return "TRADE";
  // try to reuse setup data if present
  if (snapshotId && setupId) {
    const setups = snapshotCache.get(snapshotId);
    const setup = setups?.find((s) => s.id === setupId);
    if (setup) {
      return deriveSetupDecision(setup).decision;
    }
  }
  // fallback: no info -> treat as blocked
  const noTradeReason = (outcome as { noTradeReason?: string | null }).noTradeReason ?? null;
  const rationale = (outcome as { gradeRationale?: string[] | null }).gradeRationale ?? null;
  if (noTradeReason || (rationale?.length ?? 0) > 0) {
    const decision = deriveSetupDecision({
      setupGrade: grade ?? "NO_TRADE",
      noTradeReason,
      gradeRationale: rationale ?? [],
      setupPlaybookId: (outcome as { playbookId?: string | null }).playbookId ?? null,
    } as unknown as Setup);
    return decision.decision;
  }
  return "BLOCKED";
}

function mapDecisionOutcomes(buckets: Record<"TRADE" | "WATCH" | "BLOCKED", Record<string, number>>) {
  const wrap = (bucket: Record<string, number>) => {
    const evaluatedCount = (bucket.hit_tp ?? 0) + (bucket.hit_sl ?? 0);
    const winRateTpVsSl = evaluatedCount > 0 ? (bucket.hit_tp ?? 0) / evaluatedCount : 0;
    return { ...bucket, evaluatedCount, winRateTpVsSl };
  };
  return {
    TRADE: wrap(buckets.TRADE),
    WATCH: wrap(buckets.WATCH),
    BLOCKED: wrap(buckets.BLOCKED),
  };
}

function mapGenericOutcomeBuckets(
  buckets: Record<string, Record<string, number>>,
): Record<string, { hit_tp: number; hit_sl: number; open: number; expired: number; ambiguous: number; evaluatedCount: number; winRateTpVsSl: number }> {
  const wrap = (bucket: Record<string, number>) => {
    const hit_tp = bucket.hit_tp ?? 0;
    const hit_sl = bucket.hit_sl ?? 0;
    const open = bucket.open ?? 0;
    const expired = bucket.expired ?? 0;
    const ambiguous = bucket.ambiguous ?? 0;
    const evaluatedCount = hit_tp + hit_sl;
    const winRateTpVsSl = evaluatedCount > 0 ? hit_tp / evaluatedCount : 0;
    return { hit_tp, hit_sl, open, expired, ambiguous, evaluatedCount, winRateTpVsSl };
  };
  const result: Record<string, { hit_tp: number; hit_sl: number; open: number; expired: number; ambiguous: number; evaluatedCount: number; winRateTpVsSl: number }> = {};
  Object.keys(buckets).forEach((key) => {
    result[key] = wrap(buckets[key]);
  });
  return result;
}

function remapBtcBiasReasons(buckets: Record<string, { total: number; byGrade: Record<GradeKey, number>; noTradeReasons: Record<string, number> }>): {
  buckets: Record<string, { total: number; byGrade: Record<GradeKey, number>; noTradeReasons: Record<string, number> }>;
  mappedCount: number;
} {
  let mappedCount = 0;
  const clone: Record<string, { total: number; byGrade: Record<GradeKey, number>; noTradeReasons: Record<string, number> }> = {
    "<70": { total: buckets["<70"].total, byGrade: { ...buckets["<70"].byGrade }, noTradeReasons: {} },
    "70-79": { total: buckets["70-79"].total, byGrade: { ...buckets["70-79"].byGrade }, noTradeReasons: {} },
    ">=80": { total: buckets[">=80"].total, byGrade: { ...buckets[">=80"].byGrade }, noTradeReasons: {} },
  };
  Object.entries(buckets).forEach(([bucketKey, bucket]) => {
    Object.entries(bucket.noTradeReasons).forEach(([reason, count]) => {
      const mapped = mapAlignmentReason(reason);
      if (mapped !== reason) mappedCount += count;
      clone[bucketKey].noTradeReasons[mapped] = (clone[bucketKey].noTradeReasons[mapped] ?? 0) + count;
    });
  });
  return { buckets: clone, mappedCount };
}

function mapWatchOutcomeBuckets(buckets: Record<WatchSegmentKey, Record<string, number>>) {
  const wrap = (bucket: Record<string, number>) => {
    const evaluatedCount = (bucket.hit_tp ?? 0) + (bucket.hit_sl ?? 0);
    const winRateTpVsSl = evaluatedCount > 0 ? (bucket.hit_tp ?? 0) / evaluatedCount : 0;
    return { ...bucket, evaluatedCount, winRateTpVsSl };
  };
  const result: Record<WatchSegmentKey, Record<string, number>> = {} as Record<WatchSegmentKey, Record<string, number>>;
  (Object.keys(buckets) as WatchSegmentKey[]).forEach((key) => {
    result[key] = wrap(buckets[key]);
  });
  return result;
}

function mapOutcomeBucket(bucket: Record<string, number>) {
  const hit_tp = bucket.hit_tp ?? 0;
  const hit_sl = bucket.hit_sl ?? 0;
  const open = bucket.open ?? 0;
  const expired = bucket.expired ?? 0;
  const ambiguous = bucket.ambiguous ?? 0;
  const evaluatedCount = hit_tp + hit_sl;
  const winRateTpVsSl = evaluatedCount > 0 ? hit_tp / evaluatedCount : 0;
  return { hit_tp, hit_sl, open, expired, ambiguous, evaluatedCount, winRateTpVsSl };
}

function mapBtcWatchSegments(
  stats: Record<BtcWatchSegmentKey, { count: number; sumBias: number; sumTrend: number; sumOrderflow: number; sumConf: number }>,
  watchTotal: number,
) {
  const round1 = (val: number) => Math.round(val * 10) / 10;
  const toAvg = (sum: number, count: number) => (count > 0 ? round1(sum / count) : null);
  const result: Record<
    BtcWatchSegmentKey,
    { count: number; pct: number; avgBias: number | null; avgTrend: number | null; avgOrderflow: number | null; avgConfidence: number | null }
  > = {} as Record<
    BtcWatchSegmentKey,
    { count: number; pct: number; avgBias: number | null; avgTrend: number | null; avgOrderflow: number | null; avgConfidence: number | null }
  >;
  (Object.keys(stats) as BtcWatchSegmentKey[]).forEach((key) => {
    const entry = stats[key];
    result[key] = {
      count: entry.count,
      pct: pct(entry.count, watchTotal),
      avgBias: toAvg(entry.sumBias, entry.count),
      avgTrend: toAvg(entry.sumTrend, entry.count),
      avgOrderflow: toAvg(entry.sumOrderflow, entry.count),
      avgConfidence: toAvg(entry.sumConf, entry.count),
    };
  });
  return result;
}

function isGoldAsset(playbookId: string | undefined, canonicalAssetId: string): boolean {
  if (canonicalAssetId === "gold") return true;
  if (!playbookId) return false;
  return playbookId.toLowerCase().startsWith("gold-swing");
}

function resolveScores(setup: Setup): {
  bias: number | null;
  trend: number | null;
  signalQuality: number | null;
  confidence: number | null;
} {
  const bias = typeof setup.biasScore === "number" ? setup.biasScore : null;
  const trend =
    typeof (setup as { trendScore?: number | null }).trendScore === "number"
      ? (setup as { trendScore?: number | null }).trendScore
      : setup.rings?.trendScore ?? null;
  let signalQuality = typeof (setup as { signalQuality?: number | null }).signalQuality === "number" ? (setup as { signalQuality?: number | null }).signalQuality : null;
  if (signalQuality == null) {
    const computed = computeSignalQuality(setup);
    signalQuality = computed?.score ?? null;
  }
  let confidence: number | null = null;
  if (typeof (setup as { confidence?: number | null }).confidence === "number") {
    confidence = (setup as { confidence?: number | null }).confidence ?? null;
  } else if (typeof setup.rings?.confidenceScore === "number") {
    confidence = setup.rings.confidenceScore ?? null;
  } else {
    confidence = null;
  }
  const confidenceFinal: number | null = confidence ?? null;
  const signalQualityFinal: number | null = signalQuality ?? null;
  const biasFinal: number | null = bias ?? null;
  const trendFinal: number | null = trend ?? null;
  return { bias: biasFinal, trend: trendFinal, signalQuality: signalQualityFinal, confidence: confidenceFinal };
}

function classifyWatchSegment(scores: { bias: number | null; trend: number | null; signalQuality: number | null; confidence: number | null }): WatchSegmentKey {
  const biasOk = (scores.bias ?? -Infinity) >= 70;
  const trendOk = (scores.trend ?? -Infinity) >= 50;
  const sqOk = (scores.signalQuality ?? -Infinity) >= 55;
  const confOk = (scores.confidence ?? -Infinity) >= 60;

  if (biasOk && trendOk && sqOk && confOk) return "WATCH_MEETS_REQUIREMENTS";
  if (biasOk && trendOk && sqOk && !confOk) return "WATCH_FAILS_ONLY_CONFIDENCE";
  if (biasOk && trendOk && confOk && !sqOk) return "WATCH_FAILS_ONLY_SIGNAL_QUALITY";
  if (!trendOk) return "WATCH_FAILS_TREND";
  if (!biasOk) return "WATCH_FAILS_BIAS";
  return "WATCH_OTHER";
}

function resolveOutcomeWatchSegment(snapshotCache: Map<string, Setup[]>, snapshotId?: string | null, setupId?: string | null): WatchSegmentKey {
  if (!snapshotId || !setupId) return "WATCH_OTHER";
  const setups = snapshotCache.get(snapshotId);
  const setup = setups?.find((s) => s.id === setupId);
  if (!setup) return "WATCH_OTHER";
  const scores = resolveScores(setup);
  return classifyWatchSegment(scores);
}

function mapWatchSegments(
  stats: Record<WatchSegmentKey, { count: number; sumBias: number; sumTrend: number; sumSQ: number; sumConf: number }>,
  watchTotal: number,
) {
  const round1 = (val: number) => Math.round(val * 10) / 10;
  const toAvg = (sum: number, count: number) => (count > 0 ? round1(sum / count) : null);
  const result: Record<
    WatchSegmentKey,
    { count: number; pct: number; avgBias: number | null; avgTrend: number | null; avgSignalQuality: number | null; avgConfidence: number | null }
  > = {} as Record<
    WatchSegmentKey,
    { count: number; pct: number; avgBias: number | null; avgTrend: number | null; avgSignalQuality: number | null; avgConfidence: number | null }
  >;
  (Object.keys(stats) as WatchSegmentKey[]).forEach((key) => {
    const entry = stats[key];
    result[key] = {
      count: entry.count,
      pct: pct(entry.count, watchTotal),
      avgBias: toAvg(entry.sumBias, entry.count),
      avgTrend: toAvg(entry.sumTrend, entry.count),
      avgSignalQuality: toAvg(entry.sumSQ, entry.count),
      avgConfidence: toAvg(entry.sumConf, entry.count),
    };
  });
  return result;
}

function isUpgradeCandidate(setup: Setup, scores: { bias: number | null; trend: number | null; signalQuality: number | null; confidence: number | null }): boolean {
  const validity = (setup as { validity?: { isStale?: boolean; hasInvalidLevels?: boolean; missingLevels?: boolean } | null }).validity;
  if (validity?.isStale) return false;
  if (validity?.hasInvalidLevels || validity?.missingLevels) return false;
  const eventModifierRaw = (setup as { eventModifier?: unknown }).eventModifier;
  const eventModifier = typeof eventModifierRaw === "string" ? eventModifierRaw.toLowerCase() : "";
  if (eventModifier.includes("execution_critical") || eventModifier.includes("blocked") || eventModifier.includes("knockout")) {
    return false;
  }
  const noTradeReason = ((setup as { noTradeReason?: string | null }).noTradeReason ?? "").toLowerCase();
  if (noTradeReason.includes("event") || noTradeReason.includes("conflict")) {
    return false;
  }
  const gradeDebugRaw = (setup as { gradeDebugReason?: unknown }).gradeDebugReason;
  const gradeDebug = safeJoinToLower(gradeDebugRaw);
  if (gradeDebug.includes("event") || gradeDebug.includes("conflict")) {
    return false;
  }
  const biasOk = (scores.bias ?? -Infinity) >= 65;
  const sqOk = (scores.signalQuality ?? -Infinity) >= 55;
  const confOk = (scores.confidence ?? -Infinity) >= 55;
  return biasOk && sqOk && confOk;
}

function topReasonsWithPct(breakdown: BtcAlignmentStats) {
  const entries = Object.entries(breakdown.reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count, pct: pct(count, breakdown.total) }));
  return { total: breakdown.total, top: entries };
}

function parseLevelPlausibility(setup: Setup): { stopPct: number | null; targetPct: number | null; rrr: number | null; parseError: boolean } {
  const entryZone = (setup as { entryZone?: string | null }).entryZone ?? null;
  const stopLoss = (setup as { stopLoss?: number | null }).stopLoss ?? null;
  const takeProfit = (setup as { takeProfit?: number | null }).takeProfit ?? null;
  const parseNumber = (val: string | null) => {
    if (!val) return null;
    const num = Number.parseFloat(val.replace(/[^\d.-]/g, ""));
    return Number.isFinite(num) ? num : null;
  };
  let entryMid: number | null = null;
  if (entryZone) {
    try {
      const parts = entryZone.split("-").map((p) => parseNumber(p.trim()));
      if (parts.length === 2 && parts[0] != null && parts[1] != null) {
        entryMid = (parts[0] + parts[1]) / 2;
      }
    } catch {
      entryMid = null;
    }
  }
  if (entryMid == null || entryMid === 0) return { stopPct: null, targetPct: null, rrr: null, parseError: true };
  const stop = stopLoss ?? null;
  const target = takeProfit ?? null;
  if (stop == null || target == null) return { stopPct: null, targetPct: null, rrr: null, parseError: true };
  const stopPct = Math.abs(entryMid - stop) / entryMid * 100;
  const targetPct = Math.abs(target - entryMid) / entryMid * 100;
  const rrr = stopPct > 0 ? targetPct / stopPct : null;
  if (!Number.isFinite(stopPct) || !Number.isFinite(targetPct)) {
    return { stopPct: null, targetPct: null, rrr: null, parseError: true };
  }
  return { stopPct, targetPct, rrr, parseError: false };
}

function summarizeLevelPlausibility(stats: BtcLevelStats) {
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const pctile = (arr: number[], p: number) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
    return Math.round(sorted[idx] * 10) / 10;
  };
  const avg = (arr: number[]) => (arr.length ? Math.round((sum(arr) / arr.length) * 10) / 10 : null);
  return {
    count: stats.count,
    parseErrors: stats.parseErrors,
    avgStopPct: avg(stats.stopPcts),
    p50StopPct: pctile(stats.stopPcts, 50),
    p90StopPct: pctile(stats.stopPcts, 90),
    avgTargetPct: avg(stats.targetPcts),
    p50TargetPct: pctile(stats.targetPcts, 50),
    p90TargetPct: pctile(stats.targetPcts, 90),
    avgRRR: avg(stats.rrrs),
  };
}

function bucketBtcRrrOutcomes(
  snapshotCache: Map<string, Setup[]>,
  outcomes: unknown[],
  canonicalAssetId: string,
  decisionBuckets: Record<"TRADE" | "WATCH" | "BLOCKED", Record<string, number>>,
): {
  buckets: Record<string, { hit_tp: number; hit_sl: number; open: number; expired: number; ambiguous: number; evaluatedCount: number; winRateTpVsSl: number }> | null;
  debug: { rrrBucketTotalOutcomes: number; rrrBucketDecisionMismatchSkipped: number; rrrBucketUnbucketableSkipped: number };
} {
  const buckets: Record<string, { hit_tp: number; hit_sl: number; open: number; expired: number; ambiguous: number; count: number }> = {
    "<1.0": { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0, count: 0 },
    "1.0-1.49": { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0, count: 0 },
    "1.5-1.99": { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0, count: 0 },
    ">=2.0": { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0, count: 0 },
  };
  let rrrBucketTotalOutcomes = 0;
  let rrrBucketDecisionMismatchSkipped = 0;
  let rrrBucketUnbucketableSkipped = 0;
  for (const outcome of outcomes) {
    try {
      const snapshotId = (outcome as { snapshotId?: string | null }).snapshotId;
      const setupId = (outcome as { setupId?: string | null }).setupId;
      if (!snapshotId || !setupId) continue;
      const setups = snapshotCache.get(snapshotId);
      const setup = setups?.find((s) => s.id === setupId);
      if (!setup) continue;
      const assetId = (setup.assetId ?? setup.symbol ?? "").toLowerCase();
      if (assetId !== canonicalAssetId) continue;
      // ensure this outcome is TRADE decision (align with outcomesByDecision.TRADE)
      const decision = deriveSetupDecision(setup).decision;
      if (decision !== "TRADE") {
        rrrBucketDecisionMismatchSkipped += 1;
        continue;
      }
      const plausibility = parseLevelPlausibility(setup);
      const rrr = plausibility.rrr;
      if (rrr == null) {
        rrrBucketUnbucketableSkipped += 1;
        continue;
      }
      rrrBucketTotalOutcomes += 1;
      let bucketKey: string = "<1.0";
      if (rrr >= 2.0) bucketKey = ">=2.0";
      else if (rrr >= 1.5) bucketKey = "1.5-1.99";
      else if (rrr >= 1.0) bucketKey = "1.0-1.49";
      const status = (outcome as { outcomeStatus?: string }).outcomeStatus ?? "open";
      const b = buckets[bucketKey];
      if (status in b) {
        b[status as keyof typeof b] += 1;
      }
      b.count += 1;
    } catch {
      continue;
    }
  }
  const wrap = (b: { hit_tp: number; hit_sl: number; open: number; expired: number; ambiguous: number; count: number }) => {
    const evaluatedCount = (b.hit_tp ?? 0) + (b.hit_sl ?? 0);
    const winRateTpVsSl = evaluatedCount > 0 ? (b.hit_tp ?? 0) / evaluatedCount : 0;
    return { hit_tp: b.hit_tp, hit_sl: b.hit_sl, open: b.open, expired: b.expired, ambiguous: b.ambiguous, evaluatedCount, winRateTpVsSl };
  };
  return {
    buckets: {
      "<1.0": wrap(buckets["<1.0"]),
      "1.0-1.49": wrap(buckets["1.0-1.49"]),
      "1.5-1.99": wrap(buckets["1.5-1.99"]),
      ">=2.0": wrap(buckets[">=2.0"]),
    },
    debug: { rrrBucketTotalOutcomes, rrrBucketDecisionMismatchSkipped, rrrBucketUnbucketableSkipped },
  };
}

function safeJoinToLower(value: unknown): string {
  if (Array.isArray(value)) {
    const parts = value.filter((v) => typeof v === "string") as string[];
    return parts.join(" ").toLowerCase();
  }
  if (typeof value === "string") return value.toLowerCase();
  return "";
}

function normalizeText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const joined = value.filter((v) => typeof v === "string").join(" ").trim();
    return joined.length ? joined : null;
  }
  return null;
}

function mapAlignmentReason(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes("no default alignment")) return "Alignment derived (fallback)";
  if (lower.includes("alignment derived")) return "Alignment derived (fallback)";
  return reason;
}

function pickCanonicalReason(
  decisionResult: { reasons?: string[] },
  setup: Setup,
): string | null {
  const candidate =
    (decisionResult.reasons ?? []).find((r) => r && r.trim().length > 0) ??
    normalizeText((setup as { noTradeReason?: unknown }).noTradeReason) ??
    normalizeText((setup as { gradeDebugReason?: unknown }).gradeDebugReason);
  return candidate ?? null;
}

type SummaryInputRow = { setups: unknown; snapshotTime?: Date | null; createdAt?: Date | null; label?: string | null };
type BuildSummaryParams = {
  rows: SummaryInputRow[];
  assetId: string;
  sampleWindowDays: number;
  playbookId?: string | null;
};

export function buildPhase0SummaryForAsset(params: BuildSummaryParams): AssetPhase0Summary {
  const { rows, assetId, sampleWindowDays, playbookId } = params;
  const target = assetId.toLowerCase();
  const targetUpper = target.toUpperCase();

  const decisionDistribution: Record<SetupDecision, number> = { TRADE: 0, WATCH: 0, BLOCKED: 0 };
  const gradeCounts: Record<GradeKey, number> = { A: 0, B: 0, NO_TRADE: 0 };
  const watchSegments: Record<string, number> = {};
  const upgradeReasons: Record<string, number> = {};
  const regimeDistribution: Record<string, number> = {};
  const volatilityBuckets: Record<string, number> = {};
  const blockedReasons: Record<string, number> = {};
  const noTradeReasons: Record<string, number> = {};
  const watchReasons: Record<string, number> = {};
  const labelsUsedCounts: Record<string, number> = {};
  const spxWatchSegments: Record<string, number> = {};

  for (const row of rows) {
    const setups = Array.isArray((row as { setups?: unknown }).setups) ? ((row as { setups: Setup[] }).setups ?? []) : [];
    for (const setup of setups) {
      const asset = (setup.assetId ?? setup.symbol ?? "").toUpperCase();
      const profile = (setup.profile ?? "").toUpperCase();
      const timeframe = (setup.timeframeUsed ?? setup.timeframe ?? "").toUpperCase();
      const setupPlaybookId = (setup.setupPlaybookId ?? "").toLowerCase();
      const matchesPlaybook = playbookId ? setupPlaybookId === playbookId.toLowerCase() : true;
      if (asset !== targetUpper || profile !== "SWING" || timeframe !== "1D" || !matchesPlaybook) continue;
      const labelKey = ((row as { label?: string | null }).label ?? "(null)").toString();
      labelsUsedCounts[labelKey] = (labelsUsedCounts[labelKey] ?? 0) + 1;

      const grade = normalizeGrade((setup as { setupGrade?: string | null }).setupGrade ?? null);
      gradeCounts[grade] += 1;

      const decisionResult = deriveSetupDecision(setup);
      decisionDistribution[decisionResult.decision] += 1;
      const canonicalReason = pickCanonicalReason(decisionResult, setup);
      if (canonicalReason) {
        if (decisionResult.decision === "BLOCKED") {
          blockedReasons[canonicalReason] = (blockedReasons[canonicalReason] ?? 0) + 1;
        } else if (decisionResult.decision === "WATCH") {
          watchReasons[canonicalReason] = (watchReasons[canonicalReason] ?? 0) + 1;
        }
      }

      if (target === "gold" && decisionResult.decision === "WATCH") {
        const scores = resolveScores(setup);
        const segment = classifyWatchSegment(scores);
        watchSegments[segment] = (watchSegments[segment] ?? 0) + 1;
        const isUpgrade = isUpgradeCandidate(setup, scores);
        if (isUpgrade) {
          upgradeReasons["WATCH_FAILS_TREND"] = (upgradeReasons["WATCH_FAILS_TREND"] ?? 0) + 1;
        }
      }

      if (target === "spx" && decisionResult.decision === "WATCH") {
        const segment = (setup as { watchSegment?: string | null }).watchSegment ?? deriveSpxWatchSegment(setup);
        if (segment) {
          spxWatchSegments[segment] = (spxWatchSegments[segment] ?? 0) + 1;
        }
      }

      if (target === "btc") {
        const regime = deriveRegimeTag(setup);
        regimeDistribution[regime] = (regimeDistribution[regime] ?? 0) + 1;
      }

      if (target === "spx") {
        const regime = deriveRegimeTag(setup);
        regimeDistribution[regime] = (regimeDistribution[regime] ?? 0) + 1;
      }

      if (typeof (setup as { riskReward?: { volatilityLabel?: string | null } }).riskReward?.volatilityLabel === "string") {
        const label = ((setup as { riskReward?: { volatilityLabel?: string | null } }).riskReward?.volatilityLabel ?? "unknown").toLowerCase();
        volatilityBuckets[label] = (volatilityBuckets[label] ?? 0) + 1;
      }

      // NO_TRADE reasons based on grade (independent of decision)
      if (grade === "NO_TRADE" && canonicalReason) {
        noTradeReasons[canonicalReason] = (noTradeReasons[canonicalReason] ?? 0) + 1;
      }
    }
  }

  const gradeTotal = gradeCounts.A + gradeCounts.B + gradeCounts.NO_TRADE;
  const summary: AssetPhase0Summary = {
    meta: {
      assetId: target,
      timeframe: "1D",
      sampleWindowDays,
      labelsUsedCounts: Object.keys(labelsUsedCounts).length ? labelsUsedCounts : undefined,
    },
    decisionDistribution,
    gradeDistribution: gradeTotal > 0 ? gradeCounts : undefined,
    watchSegmentsDistribution:
      target === "gold"
        ? Object.keys(watchSegments).length
          ? watchSegments
          : undefined
        : target === "spx" && Object.keys(spxWatchSegments).length
          ? spxWatchSegments
          : undefined,
    upgradeCandidates: Object.keys(upgradeReasons).length
      ? { total: Object.values(upgradeReasons).reduce((s, v) => s + v, 0), byReason: upgradeReasons }
      : { total: 0 },
    regimeDistribution: Object.keys(regimeDistribution).length ? regimeDistribution : undefined,
    diagnostics:
      Object.keys(regimeDistribution).length || Object.keys(volatilityBuckets).length
        ? {
            regimeDistribution: Object.keys(regimeDistribution).length ? regimeDistribution : undefined,
            volatilityBuckets: Object.entries(volatilityBuckets).map(([bucket, count]) => ({ bucket, count })),
          }
        : undefined,
    blockedReasonsDistribution: Object.keys(blockedReasons).length ? blockedReasons : undefined,
    noTradeReasonsDistribution: Object.keys(noTradeReasons).length ? noTradeReasons : undefined,
    watchReasonsDistribution: Object.keys(watchReasons).length ? watchReasons : undefined,
  };

  return summary;
}

/**
 * Smoke test (dev):
 * curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/admin/playbooks/phase0-gold-swing?daysBack=90"
 */
