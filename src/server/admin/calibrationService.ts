import { listSnapshotsPaged } from "@/src/server/repositories/perceptionSnapshotRepository";
import type { Setup } from "@/src/lib/engine/types";

export type CalibrationFilters = {
  playbook?: string;
  profile?: string;
  assetId?: string | null;
  days?: number;
};

export type CalibrationStats = {
  gradeCounts: Record<string, number>;
  gradeByDay: Array<{ day: string; grades: Record<string, number> }>;
  typeGradeCounts: Array<{ setupType: string; grades: Record<string, number> }>;
  averages: {
    trendScore: number | null;
    biasScore: number | null;
    orderflowScore: number | null;
    sentimentScore: number | null;
    signalQuality: number | null;
    confidence: number | null;
  };
  medians: {
    trendScore: number | null;
    biasScore: number | null;
    orderflowScore: number | null;
    sentimentScore: number | null;
    signalQuality: number | null;
    confidence: number | null;
  };
  eventModifierCounts: Record<string, number>;
  missingSentimentShare: number;
  missingOrderflowShare: number;
  noTradeReasons?: Array<{ reason: string; count: number }>;
  noTradeByBiasBin?: Array<{ bin: number; reasons: Array<{ reason: string; count: number }> }>;
  noTradeByTrendBin?: Array<{ bin: number; reasons: Array<{ reason: string; count: number }> }>;
  scoreSummaryByGrade: Array<{
    grade: string;
    count: number;
    bias: { p10: number | null; p50: number | null; p90: number | null };
    trend: { p10: number | null; p50: number | null; p90: number | null };
    scoreTotal: { p50: number | null };
    confidence: { p50: number | null };
  }>;
  recent: Array<Setup>;
};

const DEFAULT_DAYS = 30;

export async function loadCalibrationStats(filters: CalibrationFilters): Promise<CalibrationStats> {
  const days = resolveDays(filters.days);
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);

  const page = await listSnapshotsPaged({
    filters: { from, to },
    page: 1,
    pageSize: 200, // keep bounded
  });

  const setups: Setup[] = [];
  const assetFilter = resolveAssetFilter(filters.assetId);
  const strictPlaybook = filters.playbook && filters.playbook !== "all";

  for (const snap of page.snapshots) {
    const snapSetups = (snap.setups ?? []) as Setup[];
    for (const setup of snapSetups) {
      if (filters.profile && (setup.profile ?? "").toLowerCase() !== filters.profile.toLowerCase()) continue;
      if (assetFilter && !assetFilter.includes(setup.assetId)) continue;
      const setupPlaybookId = (setup as { setupPlaybookId?: string | null }).setupPlaybookId ?? null;
      if (strictPlaybook && setupPlaybookId !== filters.playbook) continue;
      if (!strictPlaybook && filters.playbook === "all" && setupPlaybookId === null) {
        // legacy allowed
      } else if (!strictPlaybook && filters.playbook && filters.playbook !== "all" && setupPlaybookId !== filters.playbook)
        continue;
      setups.push({
        ...setup,
        snapshotId: snap.id,
        snapshotCreatedAt: snap.snapshotTime.toISOString?.() ?? snap.snapshotTime,
      });
    }
  }

  const gradeCounts: Record<string, number> = {};
  const gradeByDayMap = new Map<string, Record<string, number>>();
  const eventCounts: Record<string, number> = {};
  let missingSentiment = 0;
  let missingOrderflow = 0;
  const typeGradeMap = new Map<string, Record<string, number>>();
  const noTradeReasons: Record<string, number> = {};
  const biasBinReasons = new Map<number, Record<string, number>>();
  const trendBinReasons = new Map<number, Record<string, number>>();
  const scoreByGrade: Record<
    string,
    {
      bias: number[];
      trend: number[];
      scoreTotal: number[];
      confidence: number[];
    }
  > = {};

  const collectNums = {
    trendScore: [] as number[],
    biasScore: [] as number[],
    orderflowScore: [] as number[],
    sentimentScore: [] as number[],
    signalQuality: [] as number[],
    confidence: [] as number[],
  };

  for (const setup of setups) {
    const grade = setup.setupGrade ?? "unknown";
    gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;

    const day = setup.snapshotCreatedAt ? setup.snapshotCreatedAt.slice(0, 10) : "unknown";
    const perDay = gradeByDayMap.get(day) ?? {};
    perDay[grade] = (perDay[grade] ?? 0) + 1;
    gradeByDayMap.set(day, perDay);

    const em = setup.eventModifier?.classification ?? "none";
    eventCounts[em] = (eventCounts[em] ?? 0) + 1;

    pushIfNumber(collectNums.trendScore, setup.rings?.trendScore);
    pushIfNumber(collectNums.biasScore, setup.rings?.biasScore);
    pushIfNumber(collectNums.orderflowScore, setup.rings?.orderflowScore);
    pushIfNumber(collectNums.sentimentScore, setup.rings?.sentimentScore);
    pushIfNumber(collectNums.signalQuality, (setup as { confidence?: number }).confidence);
    pushIfNumber(collectNums.confidence, setup.confidence);

    if (!isNumber(setup.rings?.sentimentScore)) missingSentiment += 1;
    if (!isNumber(setup.rings?.orderflowScore)) missingOrderflow += 1;

    const typeKey = normalizeType(setup.setupType);
    const tg = typeGradeMap.get(typeKey) ?? {};
    tg[grade] = (tg[grade] ?? 0) + 1;
    typeGradeMap.set(typeKey, tg);

    const gradeScores =
      scoreByGrade[grade] ?? { bias: [] as number[], trend: [] as number[], scoreTotal: [] as number[], confidence: [] as number[] };
    if (isNumber(setup.rings?.biasScore)) gradeScores.bias.push(setup.rings?.biasScore as number);
    if (isNumber(setup.rings?.trendScore)) gradeScores.trend.push(setup.rings?.trendScore as number);
    if (isNumber((setup as { scoreTotal?: number }).scoreTotal))
      gradeScores.scoreTotal.push((setup as { scoreTotal?: number }).scoreTotal as number);
    if (isNumber(setup.confidence)) gradeScores.confidence.push(setup.confidence as number);
    scoreByGrade[grade] = gradeScores;

    if (grade === "NO_TRADE" && setup.noTradeReason) {
      noTradeReasons[setup.noTradeReason] = (noTradeReasons[setup.noTradeReason] ?? 0) + 1;
      const biasBin = bin10(setup.rings?.biasScore);
      const trendBin = bin10(setup.rings?.trendScore);
      if (biasBin !== null) {
        const bucket = biasBinReasons.get(biasBin) ?? {};
        bucket[setup.noTradeReason] = (bucket[setup.noTradeReason] ?? 0) + 1;
        biasBinReasons.set(biasBin, bucket);
      }
      if (trendBin !== null) {
        const bucket = trendBinReasons.get(trendBin) ?? {};
        bucket[setup.noTradeReason] = (bucket[setup.noTradeReason] ?? 0) + 1;
        trendBinReasons.set(trendBin, bucket);
      }
    }
  }

  const total = setups.length || 1;

  const gradeByDay = Array.from(gradeByDayMap.entries())
    .map(([day, grades]) => ({ day, grades }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return {
    gradeCounts,
    gradeByDay,
    averages: {
      trendScore: average(collectNums.trendScore),
      biasScore: average(collectNums.biasScore),
      orderflowScore: average(collectNums.orderflowScore),
      sentimentScore: average(collectNums.sentimentScore),
      signalQuality: average(collectNums.signalQuality),
      confidence: average(collectNums.confidence),
    },
    medians: {
      trendScore: median(collectNums.trendScore),
      biasScore: median(collectNums.biasScore),
      orderflowScore: median(collectNums.orderflowScore),
      sentimentScore: median(collectNums.sentimentScore),
      signalQuality: median(collectNums.signalQuality),
      confidence: median(collectNums.confidence),
    },
    eventModifierCounts: eventCounts,
    missingSentimentShare: missingSentiment / total,
    missingOrderflowShare: missingOrderflow / total,
    typeGradeCounts: Array.from(typeGradeMap.entries()).map(([setupType, grades]) => ({ setupType, grades })),
    noTradeReasons: Object.keys(noTradeReasons).length
      ? Object.entries(noTradeReasons)
          .sort((a, b) => b[1] - a[1])
          .map(([reason, count]) => ({ reason, count }))
      : undefined,
    noTradeByBiasBin: biasBinReasons.size
      ? Array.from(biasBinReasons.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([bin, reasons]) => ({
            bin,
            reasons: Object.entries(reasons)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([reason, count]) => ({ reason, count })),
          }))
      : undefined,
    noTradeByTrendBin: trendBinReasons.size
      ? Array.from(trendBinReasons.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([bin, reasons]) => ({
            bin,
            reasons: Object.entries(reasons)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([reason, count]) => ({ reason, count })),
          }))
      : undefined,
    scoreSummaryByGrade: Object.entries(scoreByGrade).map(([grade, bucket]) => ({
      grade,
      count: (gradeCounts[grade] ?? 0) as number,
      bias: {
        p10: percentile(bucket.bias, 0.1),
        p50: percentile(bucket.bias, 0.5),
        p90: percentile(bucket.bias, 0.9),
      },
      trend: {
        p10: percentile(bucket.trend, 0.1),
        p50: percentile(bucket.trend, 0.5),
        p90: percentile(bucket.trend, 0.9),
      },
      scoreTotal: { p50: percentile(bucket.scoreTotal, 0.5) },
      confidence: { p50: percentile(bucket.confidence, 0.5) },
    })),
    recent: setups
      .slice()
      .sort((a, b) => (b.snapshotCreatedAt ?? "").localeCompare(a.snapshotCreatedAt ?? ""))
      .slice(0, 10),
  };
}

function resolveDays(days?: number): number {
  if (days === 7 || days === 30 || days === 90) return days;
  return DEFAULT_DAYS;
}

function resolveAssetFilter(assetId?: string | null): string[] | undefined {
  if (!assetId) return undefined;
  const trimmed = assetId.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "gold") {
    return ["GC=F", "XAUUSD", "XAUUSD=X", "GOLD", "gold"];
  }
  return [trimmed];
}

function pushIfNumber(list: number[], value?: number | null) {
  if (isNumber(value)) list.push(value as number);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  const sum = values.reduce((s, v) => s + v, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
  }
  return sorted[mid];
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const weight = idx - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * weight;
}

function normalizeType(type?: string | null): string {
  if (!type || type.trim().length === 0) return "no_regime_alignment";
  if (type.toLowerCase() === "unknown") return "no_regime_alignment";
  return type;
}

function bin10(value?: number | null): number | null {
  if (!isNumber(value)) return null;
  return Math.floor((value as number) / 10) * 10;
}
