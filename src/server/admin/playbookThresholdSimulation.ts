import { goldPlaybookThresholds } from "@/src/lib/engine/playbooks";
import type { OutcomeStatus } from "@/src/server/services/outcomeEvaluator";
import { listOutcomesForWindow, type SetupOutcomeRow } from "@/src/server/repositories/setupOutcomeRepository";

type StatusCounts = Record<OutcomeStatus, number>;

type SimulationParams = {
  playbookId?: string;
  days?: number;
  biasCandidates: number[];
  sqCandidates?: number[];
};

type GridRow = {
  biasMin: number;
  sqMin?: number;
  eligibleCount: number;
  delta: number;
  closedCounts: StatusCounts;
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

  const biasCandidates = params.biasCandidates.length ? params.biasCandidates : [goldPlaybookThresholds.biasMin];
  const sqCandidates = params.sqCandidates ?? [];

  const baselineBias = goldPlaybookThresholds.biasMin;
  const baselineSq = goldPlaybookThresholds.signalQualityMin;

  const baselineRows = filterEligible(outcomes, baselineBias, baselineSq);
  const baselineCounts = buildStatusCounts(baselineRows);

  const grid: GridRow[] = [];
  for (const biasMin of biasCandidates) {
    if (sqCandidates.length) {
      for (const sqMin of sqCandidates) {
        const rows = filterEligible(outcomes, biasMin, sqMin);
        grid.push({
          biasMin,
          sqMin,
          eligibleCount: rows.length,
          delta: rows.length - baselineRows.length,
          closedCounts: buildStatusCounts(rows),
        });
      }
    } else {
      const rows = filterEligible(outcomes, biasMin, undefined);
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
  };
}

function filterEligible(rows: SetupOutcomeRow[], biasMin: number, sqMin?: number): SetupOutcomeRow[] {
  return rows.filter((row) => {
    const bias = (row as { biasScore?: number }).biasScore;
    if (typeof bias !== "number" || bias < biasMin) return false;
    if (typeof sqMin === "number") {
      const sq = (row as { signalQuality?: number }).signalQuality;
      if (typeof sq !== "number" || sq < sqMin) return false;
    }
    return true;
  });
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
