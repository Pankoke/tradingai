import type { Setup } from "@/src/lib/engine/types";

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
  decision?: string | null;
  decisionVersion?: string | null;
  setupDecision?: string | null;
};

type DecisionContract = "TRADE" | "WATCH_PLUS" | "WATCH" | "BLOCKED";

function normalizeDecision(value: string | null | undefined): DecisionContract | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === "TRADE" || upper === "WATCH_PLUS" || upper === "WATCH" || upper === "BLOCKED") {
    return upper as DecisionContract;
  }
  return null;
}

export function recomputeDecisionsInSetups(
  setups: Array<Setup & Record<string, unknown>>,
  params: RecomputeParams,
): RecomputeResult {
  const canonicalAsset = params.assetId.toLowerCase();
  const timeframe = params.timeframe.toUpperCase();
  const updatedCount = 0;
  let consideredCount = 0;
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
    const decision =
      normalizeDecision((setup as { decision?: string | null }).decision ?? null) ??
      normalizeDecision(setup.setupDecision ?? null);
    if (decision) {
      decisionDistribution[decision] = (decisionDistribution[decision] ?? 0) + 1;
    } else {
      decisionDistribution.UNKNOWN = (decisionDistribution.UNKNOWN ?? 0) + 1;
    }
    return setup;
  });

  const changed = updatedCount > 0;

  return { setups: updatedSetups, updatedCount, consideredCount, decisionDistribution, updatedIds, changed };
}
