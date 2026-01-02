import { goldPlaybookThresholds } from "@/src/lib/engine/playbooks";
import type { OutcomeStatus } from "@/src/server/services/outcomeEvaluator";
import { listOutcomesForWindow, type SetupOutcomeRow } from "@/src/server/repositories/setupOutcomeRepository";
import { getSnapshotById } from "@/src/server/repositories/perceptionSnapshotRepository";
import type { Setup } from "@/src/lib/engine/types";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";

type StatusCounts = Record<OutcomeStatus, number>;

type SimulationParams = {
  playbookId?: string;
  days?: number;
  biasCandidates: number[];
  sqCandidates?: number[];
  debug?: boolean;
};

type GridRow = {
  biasMin: number;
  sqMin?: number;
  eligibleCount: number;
  delta: number;
  closedCounts: StatusCounts;
};

type DebugStats = {
  metrics: {
    biasScore: ValueStats;
    signalQuality: ValueStats;
  };
  exclusions: Record<string, number>;
  samples: Array<{
    id: string;
    biasScore?: number;
    signalQuality?: number;
    passedBaseline: boolean;
    reason?: string;
  }>;
  summary?: DebugSummary;
};

type ValueStats = {
  countTotal: number;
  countMissing: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  p10: number | null;
  p50: number | null;
  p90: number | null;
};

type DebugSummary = {
  baseline: { biasMin: number; sqMin: number };
  totals: { totalOutcomes: number; eligibleBaseline: number };
  missingRates: { bias: number; sq: number };
  scaleGuess: {
    biasScore: "0..1" | "0..100" | "unknown";
    signalQuality: "0..1" | "0..100" | "unknown";
  };
  primaryExclusionReason: "missing_bias" | "missing_sq" | "bias_below" | "sq_below" | "other" | "none";
  suggestedQueryAdjustments?: {
    biasMinSuggested?: number;
    sqMinSuggested?: number;
    note: string;
  };
};

export async function loadThresholdRelaxationSimulation(params: SimulationParams) {
  const playbookId = params.playbookId ?? "gold-swing-v0.2";
  const days = params.days ?? 730;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const outcomes = await listOutcomesForWindow({
    from,
    profile: "SWING",
    timeframe: "1D",
    mode: "all",
    playbookId,
  });

  const setupCache = await buildSetupCache(outcomes);
  const enriched = outcomes.map((row) => {
    const setup = setupCache.get(row.snapshotId)?.find((s) => s.id === row.setupId);
    const { bias, sq } = extractScores(row, setup);
    return { row, bias, sq };
  });

  const biasCandidates = params.biasCandidates.length ? params.biasCandidates : [goldPlaybookThresholds.biasMin];
  const sqCandidates = params.sqCandidates ?? [];

  const baselineBias = goldPlaybookThresholds.biasMin;
  const baselineSq = goldPlaybookThresholds.signalQualityMin;

  const debugEnabled = params.debug === true;
  const debug: DebugStats | undefined = debugEnabled
    ? {
        metrics: {
          biasScore: buildValueStats(enriched.map((r) => r.bias)),
          signalQuality: buildValueStats(enriched.map((r) => r.sq)),
        },
        exclusions: {
          missing_bias: 0,
          missing_sq: 0,
          bias_below: 0,
          sq_below: 0,
          other: 0,
        },
        samples: [],
      }
    : undefined;

  const baselineRows = filterEligible(enriched, baselineBias, baselineSq, debug);
  const baselineCounts = buildStatusCounts(baselineRows);

  if (debug && debugEnabled) {
    debug.summary = buildDebugSummary({
      baselineBias,
      baselineSq,
      totalOutcomes: outcomes.length,
      eligibleBaseline: baselineRows.length,
      metrics: debug.metrics,
      exclusions: debug.exclusions,
    });
  }

  const grid: GridRow[] = [];
  for (const biasMin of biasCandidates) {
    if (sqCandidates.length) {
      for (const sqMin of sqCandidates) {
        const rows = filterEligible(enriched, biasMin, sqMin);
        grid.push({
          biasMin,
          sqMin,
          eligibleCount: rows.length,
          delta: rows.length - baselineRows.length,
          closedCounts: buildStatusCounts(rows),
        });
      }
    } else {
      const rows = filterEligible(enriched, biasMin, undefined);
      grid.push({
        biasMin,
        eligibleCount: rows.length,
        delta: rows.length - baselineRows.length,
        closedCounts: buildStatusCounts(rows),
      });
    }
  }

  return {
    meta: {
      playbookId,
      days,
      baseline: { biasMin: baselineBias, sqMin: baselineSq },
      totalOutcomes: outcomes.length,
    },
    baseline: {
      count: baselineRows.length,
      closedCounts: baselineCounts,
    },
    grid,
    ...(debugEnabled ? { debug } : {}),
  };
}

type EnrichedOutcome = { row: SetupOutcomeRow; bias?: number | null; sq?: number | null };

function filterEligible(
  rows: EnrichedOutcome[],
  biasMin: number,
  sqMin?: number,
  debug?: DebugStats,
): SetupOutcomeRow[] {
  const eligible: SetupOutcomeRow[] = [];
  for (const item of rows) {
    const { row, bias, sq } = item;
    let reason: keyof DebugStats["exclusions"] | undefined;
    if (typeof bias !== "number") {
      debug && (debug.exclusions.missing_bias += 1);
      reason = "missing_bias";
    } else if (bias < biasMin) {
      debug && (debug.exclusions.bias_below += 1);
      reason = "bias_below";
    } else if (typeof sqMin === "number") {
      if (typeof sq !== "number") {
        debug && (debug.exclusions.missing_sq += 1);
        reason = "missing_sq";
      } else if (sq < sqMin) {
        debug && (debug.exclusions.sq_below += 1);
        reason = "sq_below";
      }
    }

    const id = `${row.snapshotId ?? "snap"}|${row.setupId ?? "setup"}`;
    if (debug && debug.samples.length < 5) {
      debug.samples.push({
        id,
        biasScore: bias ?? undefined,
        signalQuality: sq ?? undefined,
        passedBaseline: !reason,
        reason: reason ?? undefined,
      });
    }

    if (!reason) {
      eligible.push(row);
    } else if (debug) {
      debug.exclusions.other += reason === "other" ? 1 : 0;
    }
  }
  return eligible;
}

async function buildSetupCache(outcomes: SetupOutcomeRow[]): Promise<Map<string, Setup[]>> {
  const cache = new Map<string, Setup[]>();
  const snapshotIds = Array.from(new Set(outcomes.map((o) => o.snapshotId).filter(Boolean)));
  for (const id of snapshotIds) {
    const snapshot = await getSnapshotById(id);
    const setups = ((snapshot?.setups as Setup[]) ?? []).map((s) => ({
      ...s,
      rings: s.rings ?? ({} as Setup["rings"]),
    }));
    cache.set(id, setups);
  }
  return cache;
}

function extractScores(row: SetupOutcomeRow, setup?: Setup): { bias: number | null; sq: number | null } {
  const bias = coerceScore(
    (setup?.rings as { biasScore?: number })?.biasScore ??
      (setup as { biasScore?: number })?.biasScore ??
      (row as { biasScore?: number }).biasScore,
  );
  let sq =
    (setup as { signalQuality?: { score?: number } })?.signalQuality?.score ??
    (setup as { signalQuality?: number })?.signalQuality ??
    (row as { signalQuality?: number }).signalQuality ??
    null;
  if (sq == null && setup?.rings) {
    try {
      sq = computeSignalQuality(setup).score;
    } catch {
      sq = null;
    }
  }
  return { bias, sq: coerceScore(sq) };
}

function coerceScore(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const normalized = value <= 1.5 ? value * 100 : value;
  return Number.isFinite(normalized) ? normalized : null;
}

function buildStatusCounts(rows: SetupOutcomeRow[]): StatusCounts {
  const counts: StatusCounts = { hit_tp: 0, hit_sl: 0, expired: 0, ambiguous: 0, open: 0 };
  for (const row of rows) {
    const status = row.outcomeStatus as OutcomeStatus;
    if (counts[status] === undefined) continue;
    counts[status] += 1;
  }
  return counts;
}

function buildValueStats(values: Array<number | null | undefined>): ValueStats {
  const numeric = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!numeric.length) {
    return {
      countTotal: values.length,
      countMissing: values.length,
      min: null,
      max: null,
      mean: null,
      p10: null,
      p50: null,
      p90: null,
    };
  }
  const sorted = [...numeric].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    countTotal: values.length,
    countMissing: values.length - numeric.length,
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
    mean: numeric.length ? sum / numeric.length : null,
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
  };
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const clamped = clampPercentile(p);
  if (clamped === 0.5) {
    const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
    return Math.round(mean);
  }
  const idx = (values.length - 1) * clamped;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return values[lo] ?? null;
  const weight = idx - lo;
  const loVal = values[lo] ?? null;
  const hiVal = values[hi] ?? null;
  if (loVal == null || hiVal == null) return null;
  const interpolated = loVal + (hiVal - loVal) * weight;
  return Math.round(interpolated);
}

function clampPercentile(p: number): number {
  if (Number.isNaN(p) || !Number.isFinite(p)) return 0.5;
  if (p < 0) return 0;
  if (p > 1) return 1;
  return p;
}

function buildDebugSummary(input: {
  baselineBias: number;
  baselineSq: number;
  totalOutcomes: number;
  eligibleBaseline: number;
  metrics: DebugStats["metrics"];
  exclusions: Record<string, number>;
}): DebugSummary {
  const missingRates = {
    bias: ratePct(input.metrics.biasScore.countMissing, input.metrics.biasScore.countTotal),
    sq: ratePct(input.metrics.signalQuality.countMissing, input.metrics.signalQuality.countTotal),
  };

  const scaleGuess = {
    biasScore: guessScale(input.metrics.biasScore),
    signalQuality: guessScale(input.metrics.signalQuality),
  };

  let primaryExclusionReason: DebugSummary["primaryExclusionReason"] = "none";
  if (input.eligibleBaseline === 0) {
    const sorted = Object.entries(input.exclusions).sort((a, b) => b[1] - a[1]);
    const topKey = sorted[0]?.[0];
    const allowed = ["missing_bias", "missing_sq", "bias_below", "sq_below", "other"] as const;
    primaryExclusionReason = allowed.includes(topKey as any) ? (topKey as any) : "other";
  }

  const suggested: DebugSummary["suggestedQueryAdjustments"] | undefined = buildSuggestedAdjustment(
    input.baselineBias,
    input.baselineSq,
    scaleGuess,
  );

  return {
    baseline: { biasMin: input.baselineBias, sqMin: input.baselineSq },
    totals: { totalOutcomes: input.totalOutcomes, eligibleBaseline: input.eligibleBaseline },
    missingRates,
    scaleGuess,
    primaryExclusionReason,
    ...(suggested ? { suggestedQueryAdjustments: suggested } : {}),
  };
}

function guessScale(stats: ValueStats): "0..1" | "0..100" | "unknown" {
  if (stats.max === null || stats.p90 === null) return "unknown";
  if (stats.max <= 1.5 && stats.p90 <= 1.2) return "0..1";
  if (stats.max <= 100.5 && stats.p90 >= 10) return "0..100";
  return "unknown";
}

function buildSuggestedAdjustment(
  baselineBias: number,
  baselineSq: number,
  scaleGuess: { biasScore: "0..1" | "0..100" | "unknown"; signalQuality: "0..1" | "0..100" | "unknown" },
): DebugSummary["suggestedQueryAdjustments"] | undefined {
  // if values look normalized 0..1 but thresholds look like 0..100
  if (scaleGuess.biasScore === "0..1" && baselineBias >= 2) {
    return {
      biasMinSuggested: baselineBias / 100,
      sqMinSuggested: baselineSq / 100,
      note: "Scores scheinen 0..1 skaliert; Thresholds wirken 0..100. Probiere geteilt durch 100.",
    };
  }
  if (scaleGuess.biasScore === "0..100" && baselineBias <= 1.5) {
    return {
      biasMinSuggested: baselineBias * 100,
      sqMinSuggested: baselineSq * 100,
      note: "Scores scheinen 0..100 skaliert; Thresholds wirken 0..1. Probiere *100.",
    };
  }
  return undefined;
}

function ratePct(missing: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((missing / total) * 1000) / 10; // eine Dezimalstelle
}
