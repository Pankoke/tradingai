import { clamp } from "@/src/lib/math";
import type { ConfidenceAdjustmentResult } from "@/src/lib/engine/sentimentAdjustments";
import type { OrderflowMetrics } from "@/src/lib/engine/orderflowMetrics";

export const ORDERFLOW_CONFIDENCE_TUNING = {
  trendAlignmentBonus: 5,
  biasAlignmentBonus: 3,
  trendConflictPenalty: 6,
  biasConflictPenalty: 4,
  sellersHighVolumePenalty: 3,
  buyersHighVolumeBonus: 2,
  expansionPenalty: 2,
  expansionThreshold: 65,
  highVolumeThreshold: 1.35,
  choppyPenalty: 2,
  choppyThreshold: 35,
} as const;

type AdjustmentParams = {
  base: number;
  orderflow: OrderflowMetrics;
};

/**
 * Applies a lightweight confidence adjustment derived from the orderflow context.
 * The function mirrors the sentiment adapter by returning the updated score and
 * the applied delta so that callers can surface the contribution in debug views.
 */
export function applyOrderflowConfidenceAdjustment(
  params: AdjustmentParams,
): ConfidenceAdjustmentResult {
  const { base, orderflow } = params;
  let delta = 0;

  const flags = new Set(orderflow.flags ?? []);
  if (flags.has("orderflow_trend_alignment")) {
    delta += ORDERFLOW_CONFIDENCE_TUNING.trendAlignmentBonus;
  }
  if (flags.has("orderflow_bias_alignment")) {
    delta += ORDERFLOW_CONFIDENCE_TUNING.biasAlignmentBonus;
  }
  if (flags.has("orderflow_trend_conflict")) {
    delta -= ORDERFLOW_CONFIDENCE_TUNING.trendConflictPenalty;
  }
  if (flags.has("orderflow_bias_conflict")) {
    delta -= ORDERFLOW_CONFIDENCE_TUNING.biasConflictPenalty;
  }

  if (orderflow.relVolume >= ORDERFLOW_CONFIDENCE_TUNING.highVolumeThreshold) {
    if (orderflow.mode === "sellers") {
      delta -= ORDERFLOW_CONFIDENCE_TUNING.sellersHighVolumePenalty;
    } else if (orderflow.mode === "buyers") {
      delta += ORDERFLOW_CONFIDENCE_TUNING.buyersHighVolumeBonus;
    }
  }

  if (
    orderflow.expansion >= ORDERFLOW_CONFIDENCE_TUNING.expansionThreshold &&
    !flags.has("orderflow_trend_alignment")
  ) {
    delta -= ORDERFLOW_CONFIDENCE_TUNING.expansionPenalty;
  }

  if (orderflow.consistency <= ORDERFLOW_CONFIDENCE_TUNING.choppyThreshold) {
    delta -= ORDERFLOW_CONFIDENCE_TUNING.choppyPenalty;
  }

  const adjusted = clamp(Math.round(base + delta), 0, 100);
  return { adjusted, delta };
}
