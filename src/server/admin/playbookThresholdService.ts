import { goldPlaybookThresholds } from "@/src/lib/engine/playbooks";
import type { Setup } from "@/src/lib/engine/types";
import { getSnapshotById } from "@/src/server/repositories/perceptionSnapshotRepository";
import { listOutcomesForWindow, type SetupOutcomeRow } from "@/src/server/repositories/setupOutcomeRepository";

const DAY_MS = 24 * 60 * 60 * 1000;
const GOLD_PLAYBOOK_ID = "gold-swing-v0.2";
const DEFAULT_DAYS = 90;
const MAX_DELTA = 10;
const MIN_SAMPLES = 30;

type ThresholdSet = {
  biasMin: number;
  trendMin: number;
  signalQualityMin: number;
  orderflowMin: number;
};

type SensitivityPoint = { sqMin: number; winRate: number | null; samples: number };

export type ThresholdRecommendations = {
  current: ThresholdSet;
  recommended?: ThresholdSet;
  deltas?: ThresholdSet;
  samples: {
    total: number;
    closed: number;
    hitTp: number;
    hitSl: number;
    expired: number;
    ambiguous: number;
    open: number;
  };
  byGrade: Record<
    string,
    {
      hit_tp: number;
      hit_sl: number;
      expired: number;
      ambiguous: number;
      open: number;
      winRate: number | null;
    }
  >;
  sensitivity: SensitivityPoint[];
  insufficientData: boolean;
  notes: string[];
};

type RecommendationParams = {
  days?: number;
  assetId?: string;
  includeOpen?: boolean;
};

type SampleRow = {
  outcome: SetupOutcomeRow;
  setup?: Setup;
};

const GOLD_ASSET_IDS = ["GC=F", "XAUUSD", "XAUUSD=X", "GOLD", "gold"];

function resolveAssetIds(assetId?: string | null): string[] | undefined {
  if (!assetId) return undefined;
  const trimmed = assetId.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "gold") return GOLD_ASSET_IDS;
  return [trimmed];
}

export async function loadGoldThresholdRecommendations(params: RecommendationParams): Promise<ThresholdRecommendations> {
  const days = params.days ?? DEFAULT_DAYS;
  const from = new Date(Date.now() - days * DAY_MS);
  const assetIds = resolveAssetIds(params.assetId);

  const outcomes = await listOutcomesForWindow({
    from,
    assetId: assetIds && assetIds.length === 1 ? assetIds[0] : undefined,
    profile: "SWING",
    timeframe: "1D",
    limit: 500,
    playbookId: GOLD_PLAYBOOK_ID,
  });

  const samples: SampleRow[] = [];
  const snapshotCache = new Map<string, Setup[]>();
  for (const row of outcomes) {
    let setups = snapshotCache.get(row.snapshotId);
    if (!setups) {
      const snap = await getSnapshotById(row.snapshotId);
      const snapSetups = (snap?.setups as Setup[] | undefined) ?? [];
      snapshotCache.set(row.snapshotId, snapSetups);
      setups = snapSetups;
    }
    const setup = setups.find((s) => s.id === row.setupId);
    if (assetIds && setup && !assetIds.includes(setup.assetId)) continue;
    if (setup && setup.profile?.toLowerCase() !== "swing") continue;
    samples.push({ outcome: row, setup });
  }

  const aggregates = aggregateSamples(samples, params.includeOpen);
  if (aggregates.samples.closed < MIN_SAMPLES) {
    return {
      current: goldPlaybookThresholds,
      samples: aggregates.samples,
      byGrade: aggregates.byGrade,
      sensitivity: [],
      insufficientData: true,
      notes: ["Insufficient closed outcomes for recommendation"],
    };
  }

  const recommended = buildRecommendations(aggregates);
  const deltas: ThresholdSet = {
    biasMin: recommended.biasMin - goldPlaybookThresholds.biasMin,
    trendMin: recommended.trendMin - goldPlaybookThresholds.trendMin,
    signalQualityMin: recommended.signalQualityMin - goldPlaybookThresholds.signalQualityMin,
    orderflowMin: recommended.orderflowMin - goldPlaybookThresholds.orderflowMin,
  };

  const sensitivity = buildSensitivity(aggregates.closedSamples, goldPlaybookThresholds.signalQualityMin);

  return {
    current: goldPlaybookThresholds,
    recommended,
    deltas,
    samples: aggregates.samples,
    byGrade: aggregates.byGrade,
    sensitivity,
    insufficientData: false,
    notes: aggregates.notes,
  };
}

type Aggregates = {
  samples: ThresholdRecommendations["samples"];
  byGrade: ThresholdRecommendations["byGrade"];
  closedSamples: Array<{ setup: Setup; outcome: SetupOutcomeRow }>;
  notes: string[];
};

function aggregateSamples(samples: SampleRow[], includeOpen?: boolean): Aggregates {
  const initOutcome = () => ({ hit_tp: 0, hit_sl: 0, expired: 0, ambiguous: 0, open: 0, winRate: null as number | null });
  const byGrade: ThresholdRecommendations["byGrade"] = {};
  let hitTp = 0;
  let hitSl = 0;
  let expired = 0;
  let ambiguous = 0;
  let open = 0;
  const closedSamples: Array<{ setup: Setup; outcome: SetupOutcomeRow }> = [];

  for (const row of samples) {
    const grade = row.setup?.setupGrade ?? row.outcome.setupGrade ?? "unknown";
    const bucket = byGrade[grade] ?? initOutcome();
    byGrade[grade] = bucket;
    const status = row.outcome.outcomeStatus;
    if (status === "hit_tp") {
      bucket.hit_tp += 1;
      hitTp += 1;
    } else if (status === "hit_sl") {
      bucket.hit_sl += 1;
      hitSl += 1;
    } else if (status === "expired") {
      bucket.expired += 1;
      expired += 1;
    } else if (status === "ambiguous") {
      bucket.ambiguous += 1;
      ambiguous += 1;
    } else if (status === "open") {
      bucket.open += 1;
      open += 1;
      if (!includeOpen) continue;
    }
    if (row.setup) {
      closedSamples.push({ setup: row.setup, outcome: row.outcome });
    }
  }

  for (const grade of Object.keys(byGrade)) {
    const bucket = byGrade[grade];
    const closed = bucket.hit_tp + bucket.hit_sl;
    bucket.winRate = closed > 0 ? bucket.hit_tp / closed : null;
  }

  const total = samples.length;
  const closed = closedSamples.length;
  return {
    samples: { total, closed, hitTp, hitSl, expired, ambiguous, open },
    byGrade,
    closedSamples,
    notes: [],
  };
}

function buildRecommendations(data: Aggregates): ThresholdSet {
  const { closedSamples } = data;
  const winners = closedSamples.filter((s) => s.outcome.outcomeStatus === "hit_tp");
  const losers = closedSamples.filter((s) => s.outcome.outcomeStatus === "hit_sl");
  const recBias = clampDelta(
    quantile(winners.map((s) => s.setup.rings?.biasScore).filter(isNumber), 0.25) ?? goldPlaybookThresholds.biasMin,
    goldPlaybookThresholds.biasMin,
  );
  const recTrend = clampDelta(
    quantile(winners.map((s) => s.setup.rings?.trendScore).filter(isNumber), 0.25) ?? goldPlaybookThresholds.trendMin,
    goldPlaybookThresholds.trendMin,
  );
  const recSQ = clampDelta(
    quantile(winners.map((s) => s.setup.confidence ?? s.setup.rings?.confidenceScore).filter(isNumber), 0.25) ??
      goldPlaybookThresholds.signalQualityMin,
    goldPlaybookThresholds.signalQualityMin,
  );
  const recOF = clampDelta(
    quantile(winners.map((s) => s.setup.rings?.orderflowScore).filter(isNumber), 0.1) ??
      goldPlaybookThresholds.orderflowMin,
    goldPlaybookThresholds.orderflowMin,
  );

  return {
    biasMin: recBias,
    trendMin: recTrend,
    signalQualityMin: recSQ,
    orderflowMin: recOF,
  };
}

function buildSensitivity(samples: Array<{ setup: Setup; outcome: SetupOutcomeRow }>, baseSq: number): SensitivityPoint[] {
  const points: SensitivityPoint[] = [];
  for (let delta = -5; delta <= 15; delta += 5) {
    const threshold = clamp(baseSq + delta, 0, 100);
    const filtered = samples.filter((s) => {
      const sq = s.setup.confidence ?? s.setup.rings?.confidenceScore ?? null;
      return sq === null || sq === undefined ? true : sq >= threshold;
    });
    const hitTp = filtered.filter((f) => f.outcome.outcomeStatus === "hit_tp").length;
    const hitSl = filtered.filter((f) => f.outcome.outcomeStatus === "hit_sl").length;
    const closed = hitTp + hitSl;
    points.push({
      sqMin: threshold,
      samples: closed,
      winRate: closed > 0 ? hitTp / closed : null,
    });
  }
  return points;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampDelta(value: number, current: number): number {
  return clamp(value, current - MAX_DELTA, current + MAX_DELTA);
}

function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
