import type { NextRequest } from "next/server";
import { db } from "@/src/server/db/db";
import { perceptionSnapshots } from "@/src/server/db/schema/perceptionSnapshots";
import { gte } from "drizzle-orm";
import type { Setup } from "@/src/lib/engine/types";
import { respondFail, respondOk } from "@/src/server/http/apiResponse";
import { listOutcomesForWindow } from "@/src/server/repositories/setupOutcomeRepository";
import { getSnapshotById } from "@/src/server/repositories/perceptionSnapshotRepository";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";

type GradeKey = "A" | "B" | "NO_TRADE";

function normalizeGrade(value: unknown): GradeKey {
  if (value === "A" || value === "B") return value;
  return "NO_TRADE";
}

function pct(count: number, total: number): number {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10; // one decimal
}

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const daysBack = Number.parseInt(url.searchParams.get("daysBack") ?? "30", 10);
  const effectiveDays = Number.isFinite(daysBack) && daysBack > 0 ? daysBack : 30;
  const from = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000);

  try {
    const rows = await db
      .select({
        setups: perceptionSnapshots.setups,
        snapshotTime: perceptionSnapshots.snapshotTime,
      })
      .from(perceptionSnapshots)
      .where(gte(perceptionSnapshots.snapshotTime, from));

    const matches: Setup[] = [];
    for (const row of rows) {
      const setups = Array.isArray(row.setups) ? (row.setups as Setup[]) : [];
      for (const setup of setups) {
        const assetId = (setup.assetId ?? setup.symbol ?? "").toUpperCase();
        const profile = (setup.profile ?? "").toUpperCase();
        const timeframe = (setup.timeframeUsed ?? setup.timeframe ?? "").toUpperCase();
        if (assetId === "GOLD" && profile === "SWING" && timeframe === "1D") {
          matches.push(setup);
        }
      }
    }

    const total = matches.length;
    const gradeCounts: Record<GradeKey, number> = { A: 0, B: 0, NO_TRADE: 0 };
    let staleCount = 0;
    let fallbackCount = 0;

    for (const setup of matches) {
      const grade = normalizeGrade((setup as { setupGrade?: string | null }).setupGrade ?? null);
      gradeCounts[grade] += 1;
      const validity = (setup as { validity?: { isStale?: boolean } | null }).validity;
      if (validity?.isStale) staleCount += 1;
      const dataSourcePrimary = (setup as { dataSourcePrimary?: string | null }).dataSourcePrimary;
      const dataSourceUsed = (setup as { dataSourceUsed?: string | null }).dataSourceUsed ?? dataSourcePrimary;
      if (dataSourcePrimary && dataSourceUsed && dataSourcePrimary !== dataSourceUsed) {
        fallbackCount += 1;
      }
    }

    // Outcomes summary
    const outcomes = await listOutcomesForWindow({
      from,
      assetId: "GOLD",
      profile: "SWING",
      timeframe: "1D",
      mode: "all",
      limit: 2000,
    });
    const outcomeGrades: Record<GradeKey, Record<string, number>> = {
      A: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      B: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
      NO_TRADE: { hit_tp: 0, hit_sl: 0, open: 0, expired: 0, ambiguous: 0 },
    };

    const snapshotCache = new Map<string, Setup[]>();
    let signalQualityMissing = 0;
    let signalQualityTotal = 0;

    for (const outcome of outcomes) {
      const grade = normalizeGrade((outcome as { setupGrade?: string | null }).setupGrade ?? null);
      const bucket = outcomeGrades[grade];
      const status = (outcome as { outcomeStatus?: string }).outcomeStatus ?? "open";
      if (bucket[status] !== undefined) {
        bucket[status] += 1;
      }

      // signalQuality coverage
      signalQualityTotal += 1;
      let signalQuality: number | null | undefined = null;
      const snapshotId = (outcome as { snapshotId?: string | null }).snapshotId;
      const setupId = (outcome as { setupId?: string | null }).setupId;
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

    const signalQualityCoverage = {
      missingCount: signalQualityMissing,
      totalCount: signalQualityTotal,
      pctMissing: pct(signalQualityMissing, signalQualityTotal),
    };

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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return respondFail("INTERNAL_ERROR", message, 500);
  }
}

/**
 * Smoke test (dev):
 * curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/admin/playbooks/phase0-gold-swing?daysBack=90"
 */
