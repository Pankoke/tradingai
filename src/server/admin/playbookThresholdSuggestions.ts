import { listOutcomesForWindow, type SetupOutcomeRow } from "@/src/server/repositories/setupOutcomeRepository";
import type { OutcomeStatus } from "@/src/server/services/outcomeEvaluator";

type ReasonKey =
  | "bias_too_weak"
  | "trend_too_weak"
  | "orderflow_too_low"
  | "sentiment_too_low"
  | "signal_quality_too_low"
  | "confidence_too_low"
  | "other";

type MetricKey =
  | "biasScore"
  | "trendScore"
  | "orderflowScore"
  | "sentimentScore"
  | "signalQuality"
  | "confidence";

const reasonMatchers: Array<{ key: ReasonKey; metric?: MetricKey; regex: RegExp }> = [
  { key: "bias_too_weak", metric: "biasScore", regex: /bias.*<\s*(\d+)/i },
  { key: "trend_too_weak", metric: "trendScore", regex: /trend.*<\s*(\d+)/i },
  { key: "orderflow_too_low", metric: "orderflowScore", regex: /orderflow.*<\s*(\d+)/i },
  { key: "sentiment_too_low", metric: "sentimentScore", regex: /sentiment.*<\s*(\d+)/i },
  { key: "signal_quality_too_low", metric: "signalQuality", regex: /signal\s*quality.*<\s*(\d+)/i },
  { key: "confidence_too_low", metric: "confidence", regex: /confidence.*<\s*(\d+)/i },
];

function normalizeReason(reason: string | null | undefined): { key: ReasonKey; threshold: number | null } {
  if (!reason) return { key: "other", threshold: null };
  for (const matcher of reasonMatchers) {
    const match = reason.match(matcher.regex);
    if (match) {
      const threshold = match[1] ? Number.parseInt(match[1], 10) : null;
      return { key: matcher.key, threshold: Number.isFinite(threshold) ? threshold : null };
    }
  }
  return { key: "other", threshold: null };
}

type Suggestion = {
  metric: MetricKey;
  reasonKey: ReasonKey;
  currentThreshold: number | null;
  suggestedThreshold: number;
  sampleSize: number;
  wouldUnlockCount: number;
  wouldUnlockShare: number;
  distribution: { p50: number; p60: number; p70: number; p80: number; p90: number };
  riskHint: Record<OutcomeStatus, number> | null;
};

type ReasonBucket = {
  count: number;
  threshold: number | null;
  examples: string[];
  scores: number[];
  statuses: OutcomeStatus[];
};

export async function loadGoldThresholdSuggestions(params: { days?: number; percentile?: number }) {
  const days = params.days ?? 730;
  const percentile = clampPercentile(params.percentile ?? 0.7);
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await listOutcomesForWindow({
    from,
    profile: "SWING",
    timeframe: "1D",
    mode: "all",
    playbookId: "gold-swing-v0.2",
  });

  const totalOutcomes = rows.length;
  const noTradeRows = rows.filter((r) => (r.setupGrade ?? "").toUpperCase() === "NO_TRADE");
  const tradeLike = totalOutcomes - noTradeRows.length;

  const reasonBuckets: Partial<Record<ReasonKey, ReasonBucket>> = {};

  for (const row of noTradeRows) {
    const { key, threshold } = normalizeReason(row.noTradeReason);
    const bucket = (reasonBuckets[key] ??= { count: 0, threshold, examples: [], scores: [], statuses: [] });
    bucket.count += 1;
    if (bucket.threshold === null && threshold !== null) bucket.threshold = threshold;
    if (bucket.examples.length < 3 && row.noTradeReason) bucket.examples.push(row.noTradeReason);
    const metricKey = reasonMatchers.find((m) => m.key === key)?.metric;
    const score = metricKey ? (row as Record<string, unknown>)[metricKey] : undefined;
    if (typeof score === "number") bucket.scores.push(score);
    if (row.outcomeStatus) bucket.statuses.push(row.outcomeStatus as OutcomeStatus);
  }

  const topNoTradeReasons = Object.entries(reasonBuckets)
    .filter(([, bucket]) => bucket)
    .sort((a, b) => (b[1]?.count ?? 0) - (a[1]?.count ?? 0))
    .slice(0, 5)
    .map(([key, bucket]) => ({
      key,
      label: key.replace(/_/g, " "),
      count: bucket?.count ?? 0,
      share: totalOutcomes && bucket ? bucket.count / noTradeRows.length : 0,
      examples: bucket?.examples ?? [],
    }));

  const suggestions: Suggestion[] = [];
  for (const [key, bucket] of Object.entries(reasonBuckets) as Array<[ReasonKey, ReasonBucket | undefined]>) {
    if (!bucket) continue;
    const metric = reasonMatchers.find((m) => m.key === key)?.metric;
    if (!metric) continue;
    if (!bucket.scores.length) continue;
    const distribution = buildDistribution(bucket.scores);
    const suggestedThreshold = distribution[`p${Math.round(percentile * 100)}` as keyof typeof distribution] ?? null;
    if (suggestedThreshold == null) continue;
    const wouldUnlockCount = bucket.scores.filter((s) => s >= suggestedThreshold).length;
    const riskHint = bucket.statuses.length
      ? bucket.statuses.reduce<Record<OutcomeStatus, number>>((acc, status) => {
          acc[status] = (acc[status] ?? 0) + 1;
          return acc;
        }, {} as Record<OutcomeStatus, number>)
      : null;
    suggestions.push({
      metric,
      reasonKey: key,
      currentThreshold: bucket.threshold,
      suggestedThreshold,
      sampleSize: bucket.scores.length,
      wouldUnlockCount,
      wouldUnlockShare: bucket.scores.length ? wouldUnlockCount / bucket.scores.length : 0,
      distribution,
      riskHint,
    });
  }

  return {
    meta: {
      playbookId: "gold-swing-v0.2",
      days,
      percentile,
      totalOutcomes,
      totalNoTrade: noTradeRows.length,
      totalTradeLike: tradeLike,
    },
    topNoTradeReasons,
    suggestions,
  };
}

function buildDistribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 0.5),
    p60: percentile(sorted, 0.6),
    p70: percentile(sorted, 0.7),
    p80: percentile(sorted, 0.8),
    p90: percentile(sorted, 0.9),
  };
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const clamped = clampPercentile(p);
  const idx = Math.max(0, Math.ceil(clamped * values.length) - 1);
  return values[idx] ?? 0;
}

function clampPercentile(p: number): number {
  if (!Number.isFinite(p)) return 0.7;
  return Math.min(0.95, Math.max(0.05, p));
}
