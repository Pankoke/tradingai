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

type GradeKey = "A" | "B" | "NO_TRADE";

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
        createdAt: perceptionSnapshots.snapshotTime,
      })
      .from(perceptionSnapshots)
      .where(gte(perceptionSnapshots.snapshotTime, from));

    const matches: Setup[] = [];
    const biasBuckets: Record<string, { total: number; byGrade: Record<GradeKey, number>; noTradeReasons: Record<string, number> }> = {
      "<70": { total: 0, byGrade: { A: 0, B: 0, NO_TRADE: 0 }, noTradeReasons: {} },
      "70-79": { total: 0, byGrade: { A: 0, B: 0, NO_TRADE: 0 }, noTradeReasons: {} },
      ">=80": { total: 0, byGrade: { A: 0, B: 0, NO_TRADE: 0 }, noTradeReasons: {} },
    };
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
            const reason = (setup as { noTradeReason?: string | null }).noTradeReason ?? "n/a";
            b.noTradeReasons[reason] = (b.noTradeReasons[reason] ?? 0) + 1;
          }
        }
      }
    }

    const total = matches.length;
    const gradeCounts: Record<GradeKey, number> = { A: 0, B: 0, NO_TRADE: 0 };
    const decisionCounts: Record<"TRADE" | "WATCH" | "BLOCKED", number> = { TRADE: 0, WATCH: 0, BLOCKED: 0 };
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
      if (decisionFromOutcome === "WATCH") {
        watchOutcomeTotal += 1;
        if (status === "hit_tp" || status === "hit_sl") watchOutcomeTradeHits += 1;
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

    const outcomesSummaryByDecision = mapDecisionOutcomes(outcomesDecisionBuckets);
    const watchToTradeProxy =
      watchOutcomeTotal > 0 ? { count: watchOutcomeTradeHits, total: watchOutcomeTotal, pct: pct(watchOutcomeTradeHits, watchOutcomeTotal) } : null;

    return respondOk({
      meta: { assetId: "GOLD", profile: "SWING", timeframe: "1D", daysBack: effectiveDays },
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
      debugMeta: {
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
        biasHistogram: biasBuckets,
        cohortTimeRange: {
          snapshotTimeMin: minCreated ? minCreated.toISOString() : null,
          snapshotTimeMax: maxCreated ? maxCreated.toISOString() : null,
        },
      },
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

/**
 * Smoke test (dev):
 * curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/admin/playbooks/phase0-gold-swing?daysBack=90"
 */
