import { clamp } from "@/src/lib/math";
import { setupDefinitions, type SetupDefinition } from "@/src/lib/engine/setupDefinitions";
import type { SetupRings } from "@/src/lib/engine/rings";
import { isEventModifierEnabled } from "@/src/lib/config/eventModifier";

export type BaseScoreInput = {
  trendStrength?: number;
  biasScore?: number;
  momentum?: number;
  volatility?: number;
  pattern?: number;
};

export type SetupScoreBreakdown = {
  total: number;
  trend?: number;
  bias?: number;
  momentum?: number;
  volatility?: number;
  pattern?: number;
};

type WeightedComponent = {
  value?: number;
  weight: number;
};

function normalizeComponent(value?: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return clamp(value, 0, 100);
}

export function computeSetupScore(input: BaseScoreInput): SetupScoreBreakdown {
  const components: Record<keyof SetupScoreBreakdown, WeightedComponent> = {
    total: { weight: 1 },
    trend: { value: normalizeComponent(input.trendStrength), weight: 0.4 },
    bias: { value: normalizeComponent(input.biasScore), weight: 0.2 },
    momentum: { value: normalizeComponent(input.momentum), weight: 0.2 },
    volatility: { value: normalizeComponent(input.volatility), weight: 0.1 },
    pattern: { value: normalizeComponent(input.pattern), weight: 0.1 },
  };

  const validComponents = Object.entries(components).filter(
    ([key, component]) => key === "total" || component.value !== undefined,
  );

  const totalWeight = validComponents.reduce((sum, [, component]) => {
    if (component.weight && component.value !== undefined) {
      return sum + component.weight;
    }
    return sum;
  }, 0);

  const weightedSum = validComponents.reduce((sum, [, component]) => {
    if (component.value !== undefined && component.weight) {
      return sum + component.value * component.weight;
    }
    return sum;
  }, 0);

  const total =
    totalWeight > 0
      ? clamp(Math.round(weightedSum / totalWeight), 0, 100)
      : 50;

  return {
    total,
    trend: components.trend.value,
    bias: components.bias.value,
    momentum: components.momentum.value,
    volatility: components.volatility.value,
    pattern: components.pattern.value,
  };
}

const categoryBaseConfidence: Record<string, number> = {
  trend: 78,
  mean_reversion: 55,
  momentum: 62,
  range: 58,
};

const setupOverrides: Record<string, number> = {
  trend_pullback: 85,
  trend_breakout: 75,
};

function getDefinition(setupId: string): SetupDefinition | undefined {
  return setupDefinitions.find((def) => def.id === setupId);
}

export function computeAggregatedConfidence(totalScore: number, rings: SetupRings): number {
  const EVENT_MODIFIER_ENABLED = isEventModifierEnabled();
  const weights = {
    totalScore: 0.4,
    bias: 0.2,
    event: EVENT_MODIFIER_ENABLED ? 0 : 0.15,
    sentiment: 0.15,
    orderflow: 0.1,
  };

  const eventInput = EVENT_MODIFIER_ENABLED ? 50 : rings.event;

  const aggregated =
    clamp(Math.round(totalScore), 0, 100) * weights.totalScore +
    rings.bias * weights.bias +
    eventInput * weights.event +
    rings.sentiment * weights.sentiment +
    rings.orderflow * weights.orderflow;

  return clamp(Math.round(aggregated), 0, 100);
}

export function computeSetupConfidence(params: {
  setupId: string;
  score: SetupScoreBreakdown;
  rings: SetupRings;
}): number {
  const definition = getDefinition(params.setupId);
  const categoryBase = definition
    ? categoryBaseConfidence[definition.category] ?? 60
    : 60;
  const override = setupOverrides[params.setupId];
  const baseConfidence = override ?? categoryBase;
  const aggregated = computeAggregatedConfidence(params.score.total, params.rings);
  const combined = Math.round((baseConfidence + aggregated) / 2);
  return clamp(combined, 0, 100);
}

export function computeSetupBalanceScore(values: number[]): number {
  if (values.length === 0) return 50;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
    values.length;
  const stdDev = Math.sqrt(variance);
  return clamp(Math.round(100 - stdDev), 0, 100);
}
