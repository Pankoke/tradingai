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
  for (const snap of page.snapshots) {
    const snapSetups = (snap.setups ?? []) as Setup[];
    for (const setup of snapSetups) {
      if (filters.profile && (setup.profile ?? "").toLowerCase() !== filters.profile.toLowerCase()) continue;
      if (filters.assetId && setup.assetId !== filters.assetId) continue;
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
