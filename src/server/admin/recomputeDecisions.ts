import type { Setup } from "@/src/lib/engine/types";
import { deriveSetupDecision } from "@/src/lib/decision/setupDecision";

export type RecomputeParams = {
  assetId: string;
  timeframe: string;
  now?: Date;
};

export type RecomputeResult = {
  setups: Array<Setup & Record<string, unknown>>;
  updatedCount: number;
  consideredCount: number;
  decisionDistribution: Record<string, number>;
  updatedIds: string[];
  changed: boolean;
};

type SetupWithDecision = Setup & {
  setupDecision?: string | null;
  decisionCategory?: string | null;
  decisionReasons?: string[] | null;
  watchSegment?: string | null;
  decisionUpdatedAt?: string | null;
};

export function recomputeDecisionsInSetups(
  setups: Array<Setup & Record<string, unknown>>,
  params: RecomputeParams,
): RecomputeResult {
  const canonicalAsset = params.assetId.toLowerCase();
  const timeframe = params.timeframe.toUpperCase();
  const now = params.now ?? new Date();
  let updatedCount = 0;
  let consideredCount = 0;
  let changed = false;
  const decisionDistribution: Record<string, number> = {};
  const updatedIds: string[] = [];

  const updatedSetups = setups.map((raw) => {
    const setup = raw as SetupWithDecision;
    const assetMatch = (setup.assetId ?? "").toLowerCase() === canonicalAsset;
    const tf = ((setup.timeframeUsed ?? setup.timeframe ?? "") as string).toUpperCase();
    if (!assetMatch || tf !== timeframe) {
      return setup;
    }
    consideredCount += 1;
    const decisionResult = deriveSetupDecision(setup);
    decisionDistribution[decisionResult.decision] = (decisionDistribution[decisionResult.decision] ?? 0) + 1;
    const updated: SetupWithDecision = {
      ...setup,
      setupDecision: decisionResult.decision,
      decisionCategory: decisionResult.category ?? null,
      decisionReasons: decisionResult.reasons,
      watchSegment: decisionResult.watchSegment ?? null,
      decisionUpdatedAt: now.toISOString(),
    };
    const before = JSON.stringify({
      setupDecision: setup.setupDecision,
      decisionCategory: setup.decisionCategory,
      decisionReasons: setup.decisionReasons,
    });
    const after = JSON.stringify({
      setupDecision: updated.setupDecision,
      decisionCategory: updated.decisionCategory,
      decisionReasons: updated.decisionReasons,
    });
    if (before !== after) {
      updatedCount += 1;
      changed = true;
      if (typeof setup.id === "string") {
        updatedIds.push(setup.id);
      }
    }
    return updated;
  });

  return { setups: updatedSetups, updatedCount, consideredCount, decisionDistribution, updatedIds, changed };
}
