import { performance } from "perf_hooks";
import { goldPlaybookThresholds } from "@/src/lib/engine/playbooks";
import type { OutcomeStatus } from "@/src/server/services/outcomeEvaluator";
import { listOutcomesForWindow, type SetupOutcomeRow } from "@/src/server/repositories/setupOutcomeRepository";
import { getSnapshotById } from "@/src/server/repositories/perceptionSnapshotRepository";
import type { Setup } from "@/src/lib/engine/types";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";

type StatusCounts = Record<OutcomeStatus, number>;

export type SimulationParams = {
  playbookId?: string;
  days?: number;
  biasCandidates: number[];
  sqCandidates?: number[];
  confCandidates?: number[];
  debug?: boolean;
  profile?: boolean;
  limit?: number;
  closedOnly?: boolean;
  includeNoTrade?: boolean;
  useConf?: boolean;
};

export type ParsedSimulationParams = {
  simulation: SimulationParams;
  guardrails: { minClosedTotal?: number; minHits?: number; maxExpiryRate?: number; minUtility?: number };
};

export function parseSimulationParamsFromSearchParams(params: URLSearchParams): ParsedSimulationParams {
  const playbookId = params.get("playbookId") ?? "gold-swing-v0.2";
  const days = Number.parseInt(params.get("days") ?? "730", 10);
  const biasCandidates = (params.get("bias") ?? "80,78,75,72,70")
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((v) => Number.isFinite(v));
  const sqCandidatesParam = params.get("sq");
  const sqCandidates = sqCandidatesParam
    ? sqCandidatesParam
        .split(",")
        .map((v) => Number.parseInt(v.trim(), 10))
        .filter((v) => Number.isFinite(v))
    : undefined;
  const confCandidatesParam = params.get("conf");
  const confCandidates = confCandidatesParam
    ? confCandidatesParam
        .split(",")
        .map((v) => Number.parseInt(v.trim(), 10))
        .filter((v) => Number.isFinite(v))
    : undefined;
  const useConf = params.get("useConf") === "1";
  const debug = params.get("debug") === "1";
  const profile = params.get("profile") === "1";
  const limitParam = params.get("limit");
  const limit = Number.isFinite(Number(limitParam)) ? Number(limitParam) : undefined;
  const closedOnly = params.get("closedOnly") === "1";
  const includeNoTrade = params.get("includeNoTrade") === "1";
  const minClosedTotal = Number.isFinite(Number(params.get("minClosedTotal")))
    ? Number(params.get("minClosedTotal"))
    : undefined;
  const minHits = Number.isFinite(Number(params.get("minHits"))) ? Number(params.get("minHits")) : undefined;
  const maxExpiryRate = Number.isFinite(Number(params.get("maxExpiryRate")))
    ? Number(params.get("maxExpiryRate"))
    : undefined;
  const minUtility = Number.isFinite(Number(params.get("minUtility"))) ? Number(params.get("minUtility")) : undefined;

  return {
    simulation: {
      playbookId,
      days,
      biasCandidates,
      sqCandidates,
      confCandidates,
      debug,
      profile,
      limit,
      closedOnly,
      includeNoTrade,
      useConf,
    },
    guardrails: { minClosedTotal, minHits, maxExpiryRate, minUtility },
  };
}

type GridRow = {
  biasMin: number;
  sqMin?: number;
  confMin?: number;
  eligibleCount: number;
  delta: number;
  closedCounts: StatusCounts;
  kpis: {
    closedTotal: number;
    hitRate: number;
    expiryRate: number;
    winLoss: number;
    utilityScore: number;
  };
};

type DebugStats = {
  metrics: {
    biasScore: ValueStats;
    signalQuality: ValueStats;
    confidenceScore?: ValueStats;
  };
  exclusionsPerEvaluation: Record<string, number>;
  exclusionsPerOutcome: Record<string, number>;
  samples: Array<{
    id: string;
    biasScore?: number;
    signalQuality?: number;
    confidenceScore?: number;
    passedBaseline: boolean;
    reason?: string;
    setupGrade?: string | null;
    noTradeReason?: string | null;
  }>;
  excludedSamples?: Array<{ id: string; setupGrade?: string | null; noTradeReason?: string | null }>;
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
  biasGateEnabled: boolean;
  note?: string;
  primaryExclusionReason: "missing_bias" | "missing_sq" | "bias_below" | "sq_below" | "other" | "none";
  suggestedQueryAdjustments?: {
    biasMinSuggested?: number;
    sqMinSuggested?: number;
    note: string;
  };
  exclusionsSource: "per_outcome";
};

export async function loadThresholdRelaxationSimulation(params: SimulationParams) {
  const profileEnabled = params.debug === true || params.profile === true;
  const t0 = profileEnabled ? performance.now() : 0;
  const playbookId = params.playbookId ?? "gold-swing-v0.2";
  const days = params.days ?? 730;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const requestedLimit = Math.max(1, params.limit ?? 200);
  const effectiveLimit = Math.min(500, requestedLimit);
  const includeNoTrade = params.includeNoTrade === true;
  const useConf = params.useConf === true;
  const biasGateEnabled = false;

  const initialFetchLimit =
    params.closedOnly === true ? Math.min(2000, Math.max(effectiveLimit * 5 + 50, effectiveLimit + 1)) : Math.min(500, effectiveLimit + 1);
  const outcomesRaw = await listOutcomesForWindow({
    from,
    profile: "SWING",
    timeframe: "1D",
    mode: "all",
    playbookId,
    limit: initialFetchLimit, // fetch extra to detect capping/closed scarcity
  });
  const fetchOutcomesMs = profileEnabled ? performance.now() - t0 : undefined;
  const closedStatuses: OutcomeStatus[] = ["hit_tp", "hit_sl", "expired", "ambiguous"];
  let filtered = params.closedOnly
    ? outcomesRaw.filter((o) => closedStatuses.includes(o.outcomeStatus as OutcomeStatus))
    : outcomesRaw;
  let maxScanReached = false;
  if (params.closedOnly && filtered.length < effectiveLimit && outcomesRaw.length === initialFetchLimit) {
    const extraLimit = 2000;
    const extra = await listOutcomesForWindow({
      from,
      profile: "SWING",
      timeframe: "1D",
      mode: "all",
      playbookId,
      limit: extraLimit,
    });
    const closedExtra = extra.filter((o) => closedStatuses.includes(o.outcomeStatus as OutcomeStatus));
    filtered = closedExtra.slice(0, effectiveLimit);
    maxScanReached = closedExtra.length >= extraLimit;
  }
  const scannedTotal = filtered.length;
  const isCapped = filtered.length > effectiveLimit;
  const capped = filtered.slice(0, effectiveLimit);
  const beforeGradeFilter = capped.length;
  const evaluated = includeNoTrade
    ? capped
    : capped.filter((o) => (o.setupGrade ?? "").toUpperCase() !== "NO_TRADE");
  const excludedNoTrade = beforeGradeFilter - evaluated.length;
  const includedNoTrade = evaluated.filter((o) => (o.setupGrade ?? "").toUpperCase() === "NO_TRADE").length;
  const noTradeCount = capped.filter((o) => (o.setupGrade ?? "").toUpperCase() === "NO_TRADE").length;

  const tExtractStart = profileEnabled ? performance.now() : 0;
  const setupCache = await buildSetupCache(evaluated);
  const enriched = evaluated.map((row) => {
    const setup = setupCache.get(row.snapshotId)?.find((s) => s.id === row.setupId);
    const { bias, sq, conf } = extractScores(row, setup);
    return { row, bias, sq, conf };
  });
  const normalizeMs = profileEnabled ? performance.now() - tExtractStart : undefined;

  const biasCandidates = params.biasCandidates.length ? params.biasCandidates : [goldPlaybookThresholds.biasMin];
  const sqCandidates = params.sqCandidates ?? [];
  const confCandidatesParam = params.confCandidates ?? [];

  const baselineBias = goldPlaybookThresholds.biasMin;
  const baselineSq = goldPlaybookThresholds.signalQualityMin;

  const sqStatsAll = buildValueStats(enriched.map((r) => r.sq));
  const confStatsAll = buildValueStats(enriched.map((r) => r.conf));
  const defaultSqCandidates =
    sqCandidates && sqCandidates.length
      ? sqCandidates
      : buildDefaultSqGrid(sqStatsAll) ?? [45, 50, 55, 60, 65];
  const effectiveSqCandidates = sqCandidates && sqCandidates.length ? sqCandidates : defaultSqCandidates;
  const defaultConfCandidates =
    confCandidatesParam && confCandidatesParam.length
      ? confCandidatesParam
      : buildDefaultSqGrid(confStatsAll) ?? [55, 60, 65, 70];
  const effectiveConfCandidates =
    confCandidatesParam && confCandidatesParam.length ? confCandidatesParam : defaultConfCandidates;
  const baselineConf = useConf ? effectiveConfCandidates[0] : undefined;

  const debugEnabled = params.debug === true;
  const debug: DebugStats | undefined = debugEnabled
    ? {
        metrics: {
          biasScore: buildValueStats(enriched.map((r) => r.bias)),
          signalQuality: sqStatsAll,
          confidenceScore: confStatsAll,
        },
        exclusionsPerEvaluation: initExclusionBuckets(),
        exclusionsPerOutcome: initExclusionBuckets(),
        samples: [],
        excludedSamples: [],
      }
    : undefined;

  const tGridStart = profileEnabled ? performance.now() : 0;
  const baselineRows = filterEligible(enriched, baselineBias, baselineSq, baselineConf, debug, useConf, biasGateEnabled);
  const baselineCounts = buildStatusCounts(baselineRows);
  if (debug && debugEnabled) {
    collectOutcomeExclusions(enriched, baselineBias, baselineSq, baselineConf, debug, useConf, biasGateEnabled);
  }

  if (debug && debugEnabled) {
    if (!includeNoTrade) {
      const excluded = capped
        .filter((o) => (o.setupGrade ?? "").toUpperCase() === "NO_TRADE")
        .slice(0, 3)
        .map((o) => ({
          id: `${o.snapshotId ?? "snap"}|${o.setupId ?? "setup"}`,
          setupGrade: o.setupGrade ?? null,
          noTradeReason: (o as { noTradeReason?: string }).noTradeReason ?? null,
        }));
      debug.excludedSamples = excluded;
    }
    debug.summary = buildDebugSummary({
      baselineBias,
      baselineSq,
      totalOutcomes: evaluated.length,
      eligibleBaseline: baselineRows.length,
      metrics: debug.metrics,
      exclusions: debug.exclusionsPerOutcome,
      biasGateEnabled,
    });
  }

  const grid: GridRow[] = [];
  const effectiveBiasCandidates = biasGateEnabled ? biasCandidates : [baselineBias];
  for (const biasMin of effectiveBiasCandidates) {
    if (effectiveSqCandidates.length) {
      for (const sqMin of effectiveSqCandidates) {
        if (useConf && effectiveConfCandidates.length) {
          for (const confMin of effectiveConfCandidates) {
            const rows = filterEligible(enriched, biasMin, sqMin, confMin, debug, useConf, biasGateEnabled);
            const closedCounts = buildStatusCounts(rows);
            grid.push({
              biasMin,
              sqMin,
              confMin,
              eligibleCount: rows.length,
              delta: rows.length - baselineRows.length,
              closedCounts,
              kpis: buildKpis(closedCounts),
            });
          }
        } else {
          const rows = filterEligible(enriched, biasMin, sqMin, undefined, debug, useConf, biasGateEnabled);
          const closedCounts = buildStatusCounts(rows);
          grid.push({
            biasMin,
            sqMin,
            eligibleCount: rows.length,
            delta: rows.length - baselineRows.length,
            closedCounts,
            kpis: buildKpis(closedCounts),
          });
        }
      }
    } else {
      const rows = filterEligible(enriched, biasMin, undefined, undefined, debug, useConf, biasGateEnabled);
      const closedCounts = buildStatusCounts(rows);
      grid.push({
        biasMin,
        eligibleCount: rows.length,
        delta: rows.length - baselineRows.length,
        closedCounts,
        kpis: buildKpis(closedCounts),
      });
    }
  }

  const gridEvalMs = profileEnabled ? performance.now() - tGridStart : undefined;
  const totalMs = profileEnabled ? performance.now() - t0 : undefined;

  return {
    meta: {
      playbookId,
      days,
      baseline: { biasMin: baselineBias, sqMin: baselineSq },
      totalOutcomes: evaluated.length,
      biasGateEnabled,
      limitUsed: effectiveLimit,
      isCapped,
      totalOutcomesMatching: filtered.length,
      scannedTotal,
      collectedClosed: params.closedOnly ? filtered.length : undefined,
      maxScanReached: params.closedOnly ? maxScanReached : undefined,
      population: {
        totalFetched: outcomesRaw.length,
        afterClosedOnly: filtered.length,
        excludedNoTrade,
        includedNoTrade,
        tradeableCount: filtered.length - noTradeCount,
        noTradeCount,
        noTradeRate: filtered.length ? noTradeCount / filtered.length : 0,
        gradeCounts: buildGradeCounts(evaluated),
        outcomeStatusCounts: buildStatusCounts(evaluated),
      },
      ...(profileEnabled
        ? {
            timings: {
              fetchOutcomesMs: fetchOutcomesMs ?? 0,
              normalizeMs: normalizeMs ?? 0,
              gridEvalMs: gridEvalMs ?? 0,
              recommendationMs: 0,
              totalMs: totalMs ?? 0,
            },
          }
        : {}),
    },
    baseline: {
      count: baselineRows.length,
      closedCounts: baselineCounts,
    },
    grid,
    ...(debugEnabled ? { debug } : {}),
  };
}

function buildKpis(counts: StatusCounts) {
  const closedTotal = counts.hit_tp + counts.hit_sl + counts.expired + counts.ambiguous;
  const tpSl = counts.hit_tp + counts.hit_sl;
  const hitRate = tpSl > 0 ? counts.hit_tp / tpSl : 0;
  const expiryRate = closedTotal > 0 ? counts.expired / closedTotal : 0;
  const winLoss = counts.hit_sl > 0 ? counts.hit_tp / counts.hit_sl : counts.hit_tp > 0 ? counts.hit_tp : 0;
  const utilityScore = hitRate * 100 - expiryRate * 20;
  return { closedTotal, hitRate, expiryRate, winLoss, utilityScore };
}

function buildDefaultSqGrid(stats: ValueStats): number[] | null {
  if (!stats.p10 || !stats.p90) return null;
  const start = Math.max(0, Math.floor(stats.p10 / 5) * 5);
  const end = Math.ceil(stats.p90 / 5) * 5;
  if (end <= start) return null;
  const values: number[] = [];
  for (let v = start; v <= end; v += 5) {
    values.push(v);
  }
  return values.length ? values : null;
}

type EnrichedOutcome = { row: SetupOutcomeRow; bias?: number | null; sq?: number | null; conf?: number | null };

function filterEligible(
  rows: EnrichedOutcome[],
  biasMin: number,
  sqMin?: number,
  confMin?: number,
  debug?: DebugStats,
  useConf?: boolean,
): SetupOutcomeRow[] {
  const eligible: SetupOutcomeRow[] = [];
  const evalExcl = debug?.exclusionsPerEvaluation;
  for (const item of rows) {
    const { row, bias, sq, conf } = item as EnrichedOutcome & { conf?: number | null };
    let reason: keyof DebugStats["exclusionsPerEvaluation"] | undefined;
    // Bias gate disabled in Phase 5.2: track missing/below for observability only, do not gate
    if (typeof bias !== "number") {
      evalExcl && (evalExcl.missing_bias += 1);
    } else if (bias < biasMin) {
      evalExcl && (evalExcl.bias_below += 1);
    }

    if (typeof sqMin === "number") {
      if (typeof sq !== "number") {
        evalExcl && (evalExcl.missing_sq += 1);
        reason = "missing_sq";
      } else if (sq < sqMin) {
        evalExcl && (evalExcl.sq_below += 1);
        reason = "sq_below";
      }
    }
    if (useConf && typeof confMin === "number") {
      if (typeof conf !== "number") {
        evalExcl && (evalExcl.missing_conf = (evalExcl.missing_conf ?? 0) + 1);
        reason = reason ?? "missing_sq"; // reuse bucket when missing conf to avoid new key explosion
      } else if (conf < confMin) {
        evalExcl && (evalExcl.conf_below = (evalExcl.conf_below ?? 0) + 1);
        reason = reason ?? "other";
      }
    }

    const id = `${row.snapshotId ?? "snap"}|${row.setupId ?? "setup"}`;
    if (debug && debug.samples.length < 5) {
      debug.samples.push({
        id,
        biasScore: bias ?? undefined,
        signalQuality: sq ?? undefined,
        confidenceScore: conf ?? undefined,
        passedBaseline: !reason,
        reason: reason ?? undefined,
        setupGrade: row.setupGrade ?? null,
        noTradeReason: (row as { noTradeReason?: string }).noTradeReason ?? null,
      });
    }

    if (!reason) {
      eligible.push(row);
    } else if (evalExcl) {
      evalExcl.other += reason === "other" ? 1 : 0;
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

function extractScores(row: SetupOutcomeRow, setup?: Setup): { bias: number | null; sq: number | null; conf: number | null } {
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
  const conf =
    (setup?.rings as { confidenceScore?: number })?.confidenceScore ??
    (setup as { confidence?: number })?.confidence ??
    (row as { confidence?: number }).confidence ??
    null;
  return { bias, sq: coerceScore(sq), conf: coerceScore(conf) };
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

function buildGradeCounts(rows: SetupOutcomeRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = (row.setupGrade ?? "unknown").toString();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
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
  biasGateEnabled: boolean;
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
    const allowed = ["missing_bias", "missing_sq", "missing_conf", "bias_below", "sq_below", "conf_below", "other"] as const;
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
    biasGateEnabled: input.biasGateEnabled,
    note: input.biasGateEnabled ? undefined : "Bias-Gate deaktiviert (Phase 5.2, SQ-only Gating).",
    exclusionsSource: "per_outcome",
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

function initExclusionBuckets(): Record<string, number> {
  return {
    missing_bias: 0,
    missing_sq: 0,
    missing_conf: 0,
    bias_below: 0,
    sq_below: 0,
    conf_below: 0,
    other: 0,
  };
}

function collectOutcomeExclusions(
  rows: EnrichedOutcome[],
  biasMin: number,
  sqMin?: number,
  confMin?: number,
  debug?: DebugStats,
  useConf?: boolean,
  biasGateEnabled?: boolean,
): void {
  if (!debug) return;
  for (const item of rows) {
    const { bias, sq, conf } = item as EnrichedOutcome & { conf?: number | null };
    let reason: keyof DebugStats["exclusionsPerOutcome"] | undefined;
    if (typeof bias !== "number") {
      reason = "missing_bias";
    } else if (biasGateEnabled && bias < biasMin) {
      reason = "bias_below";
    } else if (typeof sqMin === "number") {
      if (typeof sq !== "number") {
        reason = "missing_sq";
      } else if (sq < sqMin) {
        reason = "sq_below";
      }
    }
    if (!reason && useConf && typeof confMin === "number") {
      if (typeof conf !== "number") reason = "missing_conf";
      else if (conf < confMin) reason = "conf_below";
    }
    if (reason) {
      debug.exclusionsPerOutcome[reason] = (debug.exclusionsPerOutcome[reason] ?? 0) + 1;
    }
  }
}
