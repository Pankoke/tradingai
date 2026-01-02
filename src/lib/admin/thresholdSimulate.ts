export type SimulationPopulation = {
  totalFetched: number;
  afterClosedOnly: number;
  excludedNoTrade: number;
  includedNoTrade: number;
  tradeableCount: number;
  noTradeCount: number;
  noTradeRate: number;
  gradeCounts: Record<string, number>;
  outcomeStatusCounts: Record<string, number>;
  noTradeReasonCounts?: Record<string, number>;
  noTradeReasonExamples?: Record<string, string[]>;
  excludedNoTradeReasons?: Record<string, number>;
};

export type SimulationKpis = {
  closedTotal: number;
  hitRate: number;
  expiryRate: number;
  winLoss: number;
  utilityScore: number;
};

export type SimulationGridRow = {
  biasMin: number;
  sqMin?: number;
  confMin?: number;
  eligibleCount: number;
  delta: number;
  closedCounts: {
    hit_tp: number;
    hit_sl: number;
    expired: number;
    ambiguous: number;
    open: number;
  };
  kpis: SimulationKpis;
};

export type SimulationMeta = {
  playbookId: string;
  days: number;
  baseline: { biasMin: number; sqMin: number };
  totalOutcomes: number;
  biasGateEnabled: boolean;
  limitUsed: number;
  isCapped: boolean;
  totalOutcomesMatching: number;
  scannedTotal?: number;
  collectedClosed?: number;
  maxScanReached?: boolean;
  population?: SimulationPopulation;
  timings?: {
    fetchOutcomesMs: number;
    normalizeMs: number;
    gridEvalMs: number;
    recommendationMs: number;
    totalMs: number;
  };
};

export type SimulationResponse = {
  meta: SimulationMeta;
  baseline: { count: number; closedCounts: SimulationGridRow["closedCounts"] };
  grid: SimulationGridRow[];
};

export type RecommendationGuardrails = {
  minClosedTotal: number;
  minHits: number;
  maxExpiryRate?: number;
  minUtility?: number;
};

export type RecommendationResult =
  | { row: SimulationGridRow; label: string; note?: string }
  | { row: null; label: "No recommendation"; note?: string };

export function pickRecommendation(
  rows: SimulationGridRow[],
  guardrails: RecommendationGuardrails,
): RecommendationResult {
  if (!rows.length) return { row: null, label: "No recommendation" };
  const withEnoughSamples = rows.filter(
    (r) => r.kpis.closedTotal >= guardrails.minClosedTotal && r.closedCounts.hit_tp >= guardrails.minHits,
  );
  const pool = withEnoughSamples.length ? withEnoughSamples : rows;
  const sorted = [...pool].sort((a, b) => b.kpis.utilityScore - a.kpis.utilityScore || b.kpis.closedTotal - a.kpis.closedTotal);
  const best = sorted[0];
  if (!best) return { row: null, label: "No recommendation" };
  const lowSample = best.kpis.closedTotal < guardrails.minClosedTotal;
  const label = lowSample ? "Low confidence recommendation" : "Recommended";
  const note = lowSample ? "Guardrails not met; picked highest utility/volume available." : undefined;
  return { row: best, label, note };
}

export type RecommendationV2 = {
  primary: RecommendationChoice | null;
  alternatives: RecommendationChoice[];
  guardrails: RecommendationGuardrails & { unmet: string[]; satisfied: boolean };
  deltas?: {
    hitRateDelta: number;
    expiryRateDelta: number;
    utilityDelta: number;
    closedTotalDelta: number;
  };
  diagnostics: { considered: number; valid: number; excludedSummary: Record<string, number> };
};

type RecommendationChoice = {
  row: SimulationGridRow;
  adjustedUtility: number;
  label: string;
  rationale?: string;
  unmetGuardrails?: string[];
};

export function recommendThresholdV2(
  rows: SimulationGridRow[],
  baselineCounts: SimulationGridRow["closedCounts"] | null,
  guardrails: RecommendationGuardrails,
): RecommendationV2 {
  const unmet: string[] = [];
  const evaluated = rows.map((row) => {
    const closedTotal = row.kpis.closedTotal;
    const hits = row.closedCounts.hit_tp;
    const expiryOk =
      typeof guardrails.maxExpiryRate === "number" ? row.kpis.expiryRate <= guardrails.maxExpiryRate : true;
    const utilityOk =
      typeof guardrails.minUtility === "number" ? row.kpis.utilityScore >= guardrails.minUtility : true;
    const valid =
      closedTotal >= guardrails.minClosedTotal &&
      hits >= guardrails.minHits &&
      expiryOk &&
      utilityOk;
    const confidenceWeight = computeConfidenceWeight(closedTotal, guardrails.minClosedTotal);
    const adjustedUtility = row.kpis.utilityScore * (0.65 + 0.35 * confidenceWeight);
    return { row, valid, adjustedUtility, confidenceWeight };
  });

  const valid = evaluated.filter((e) => e.valid);
  const sorted = (valid.length ? valid : evaluated).sort((a, b) => {
    if (b.adjustedUtility !== a.adjustedUtility) return b.adjustedUtility - a.adjustedUtility;
    if (b.row.kpis.closedTotal !== a.row.kpis.closedTotal) return b.row.kpis.closedTotal - a.row.kpis.closedTotal;
    if (a.row.kpis.expiryRate !== b.row.kpis.expiryRate) return a.row.kpis.expiryRate - b.row.kpis.expiryRate;
    return b.row.kpis.hitRate - a.row.kpis.hitRate;
  });

  const primaryEval = sorted[0] ?? null;
  const primary: RecommendationChoice | null = primaryEval
    ? {
        row: primaryEval.row,
        adjustedUtility: primaryEval.adjustedUtility,
        label: primaryEval.valid ? "Primary Recommendation" : "Low confidence recommendation",
        unmetGuardrails: primaryEval.valid ? [] : listUnmet(primaryEval.row, guardrails),
      }
    : null;

  const alternatives: RecommendationChoice[] = [];
  if (primaryEval) {
    for (const candidate of sorted.slice(1)) {
      if (alternatives.length >= 3) break;
      const rationale = buildAltRationale(primaryEval, candidate);
      if (!rationale) continue;
      alternatives.push({
        row: candidate.row,
        adjustedUtility: candidate.adjustedUtility,
        label: rationale.label,
        rationale: rationale.reason,
      });
    }
  }

  const guardrailUnmet = primaryEval && !primaryEval.valid ? listUnmet(primaryEval.row, guardrails) : [];
  if (guardrailUnmet.length) unmet.push(...guardrailUnmet);

  const baselineKpis = baselineCounts ? computeKpisFromCounts(baselineCounts) : null;
  const deltas =
    primaryEval && baselineKpis
      ? {
          hitRateDelta: primaryEval.row.kpis.hitRate - baselineKpis.hitRate,
          expiryRateDelta: primaryEval.row.kpis.expiryRate - baselineKpis.expiryRate,
          utilityDelta: primaryEval.row.kpis.utilityScore - baselineKpis.utilityScore,
          closedTotalDelta: primaryEval.row.kpis.closedTotal - baselineKpis.closedTotal,
        }
      : undefined;

  return {
    primary,
    alternatives,
    guardrails: { ...guardrails, unmet, satisfied: unmet.length === 0 },
    deltas,
    diagnostics: {
      considered: rows.length,
      valid: valid.length,
      excludedSummary: {
        belowMinClosed: evaluated.filter((e) => e.row.kpis.closedTotal < guardrails.minClosedTotal).length,
        belowMinHits: evaluated.filter((e) => e.row.closedCounts.hit_tp < guardrails.minHits).length,
        aboveMaxExpiry:
          guardrails.maxExpiryRate !== undefined
            ? evaluated.filter((e) => e.row.kpis.expiryRate > (guardrails.maxExpiryRate ?? 0)).length
            : 0,
      },
    },
  };
}

function listUnmet(row: SimulationGridRow, guardrails: RecommendationGuardrails): string[] {
  const unmet: string[] = [];
  if (row.kpis.closedTotal < guardrails.minClosedTotal) unmet.push(`closedTotal < ${guardrails.minClosedTotal}`);
  if (row.closedCounts.hit_tp < guardrails.minHits) unmet.push(`hit_tp < ${guardrails.minHits}`);
  if (guardrails.maxExpiryRate !== undefined && row.kpis.expiryRate > guardrails.maxExpiryRate) {
    unmet.push(`expiryRate > ${guardrails.maxExpiryRate}`);
  }
  if (guardrails.minUtility !== undefined && row.kpis.utilityScore < guardrails.minUtility) {
    unmet.push(`utility < ${guardrails.minUtility}`);
  }
  return unmet;
}

function buildAltRationale(
  primary: { row: SimulationGridRow; adjustedUtility: number },
  candidate: { row: SimulationGridRow; adjustedUtility: number },
): { label: string; reason: string } | null {
  const p = primary.row.kpis;
  const c = candidate.row.kpis;
  if (c.expiryRate < p.expiryRate && c.closedTotal >= p.closedTotal * 0.7) {
    return { label: "Safer", reason: "Lower expiry rate with comparable volume" };
  }
  if (candidate.adjustedUtility > primary.adjustedUtility && c.closedTotal >= p.closedTotal * 0.5) {
    return { label: "Higher quality", reason: "Higher adjusted utility / hit rate" };
  }
  if (c.closedTotal >= p.closedTotal * 1.3 && candidate.adjustedUtility >= primary.adjustedUtility - 5) {
    return { label: "More volume", reason: "Significantly more closed samples with similar utility" };
  }
  return null;
}

function computeConfidenceWeight(closedTotal: number, minClosedTotal: number): number {
  const base = Math.max(1, minClosedTotal * 5);
  const weight = Math.log10(closedTotal + 1) / Math.log10(base);
  return Math.min(1, Math.max(0, weight));
}

export function computeKpisFromCounts(counts: SimulationGridRow["closedCounts"]) {
  const closedTotal = counts.hit_tp + counts.hit_sl + counts.expired + counts.ambiguous;
  const tpSl = counts.hit_tp + counts.hit_sl;
  const hitRate = tpSl > 0 ? counts.hit_tp / tpSl : 0;
  const expiryRate = closedTotal > 0 ? counts.expired / closedTotal : 0;
  const winLoss = counts.hit_sl > 0 ? counts.hit_tp / counts.hit_sl : counts.hit_tp > 0 ? counts.hit_tp : 0;
  const utilityScore = hitRate * 100 - expiryRate * 20;
  return { closedTotal, hitRate, expiryRate, winLoss, utilityScore };
}

export function buildMatrix(rows: SimulationGridRow[]): {
  sqValues: number[];
  confValues: number[];
  cells: Record<string, SimulationGridRow>;
} {
  const sqValues = Array.from(new Set(rows.map((r) => r.sqMin ?? 0))).sort((a, b) => a - b);
  const confValues = Array.from(new Set(rows.map((r) => r.confMin ?? 0))).sort((a, b) => a - b);
  const cells: Record<string, SimulationGridRow> = {};
  for (const row of rows) {
    const key = `${row.sqMin ?? 0}|${row.confMin ?? 0}`;
    cells[key] = row;
  }
  return { sqValues, confValues, cells };
}

export function utilityClass(score: number): string {
  if (score >= 60) return "bg-emerald-700/60 text-emerald-50";
  if (score >= 30) return "bg-emerald-600/40 text-emerald-50";
  if (score >= 0) return "bg-slate-800 text-slate-100";
  return "bg-amber-900/70 text-amber-100";
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
