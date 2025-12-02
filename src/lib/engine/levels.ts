import { clamp } from "@/src/lib/math";

type Direction = "long" | "short" | "neutral";

export type SetupLevelCategory =
  | "pullback"
  | "breakout"
  | "range"
  | "trendContinuation"
  | "liquidityGrab"
  | "unknown";

export type VolatilityLabel = "low" | "medium" | "high";

export type RiskRewardSummary = {
  riskPercent: number | null;
  rewardPercent: number | null;
  rrr: number | null;
  volatilityLabel: VolatilityLabel | null;
};

export interface ComputedLevels {
  entryZone: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  debug: {
    bandPct: number | null;
    referencePrice: number | null;
    category: SetupLevelCategory;
    volatilityScore: number | null;
    scoreVolatility: number | null;
    volatilityFactor: number | null;
    stopFactor: number | null;
    targetFactor: number | null;
    confidenceScore: number | null;
    baseBand: number | null;
    volatilityScoreUsed: number | null;
    confidenceScoreUsed: number | null;
  };
  riskReward: RiskRewardSummary;
}

const categoryBands: Record<SetupLevelCategory, number> = {
  pullback: 0.007,
  breakout: 0.009,
  range: 0.006,
  trendContinuation: 0.008,
  liquidityGrab: 0.011,
  unknown: 0.006,
};

function clampPercent(value?: number): number {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 50;
  }
  return clamp(Math.round(value), 0, 100);
}

function determinePrecision(price: number): number {
  const magnitude = Math.abs(price);
  if (magnitude >= 1000) return 2;
  if (magnitude >= 100) return 3;
  if (magnitude >= 10) return 3;
  if (magnitude >= 1) return 4;
  return 4;
}

function badgeLogging(message: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[computeLevelsForSetup] ${message}`);
  }
}

function formatPrice(value: number, precision: number): string {
  return value.toFixed(precision);
}

function ensureOrder(values: [number, number]): [number, number] {
  const [a, b] = values;
  return a <= b ? [a, b] : [b, a];
}

type RiskRewardInput = {
  direction: Direction;
  entryPrice: number;
  stopLossValue: number;
  takeProfitValue: number;
  volatilityScore: number;
};

function determineVolatilityLabel(score?: number | null): VolatilityLabel | null {
  if (score === undefined || score === null || Number.isNaN(score)) {
    return null;
  }
  if (score >= 70) {
    return "high";
  }
  if (score >= 40) {
    return "medium";
  }
  return "low";
}

function computeRiskReward(input: RiskRewardInput): RiskRewardSummary {
  const { direction, entryPrice, stopLossValue, takeProfitValue, volatilityScore } = input;
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return {
      riskPercent: null,
      rewardPercent: null,
      rrr: null,
      volatilityLabel: determineVolatilityLabel(volatilityScore),
    };
  }

  const riskDelta =
    direction === "short" ? stopLossValue - entryPrice : entryPrice - stopLossValue;
  const rewardDelta =
    direction === "short" ? entryPrice - takeProfitValue : takeProfitValue - entryPrice;

  if (!Number.isFinite(riskDelta) || !Number.isFinite(rewardDelta) || riskDelta <= 0 || rewardDelta <= 0) {
    return {
      riskPercent: null,
      rewardPercent: null,
      rrr: null,
      volatilityLabel: determineVolatilityLabel(volatilityScore),
    };
  }

  const riskPercent = (riskDelta / entryPrice) * 100;
  const rewardPercent = (rewardDelta / entryPrice) * 100;
  const rrr = rewardPercent / riskPercent;

  return {
    riskPercent,
    rewardPercent,
    rrr: Number.isFinite(rrr) ? rrr : null,
    volatilityLabel: determineVolatilityLabel(volatilityScore),
  };
}

function getBaseBandForCategory(category: SetupLevelCategory): number {
  return categoryBands[category] ?? categoryBands["unknown"];
}

export function computeLevelsForSetup(params: {
  direction: Direction;
  referencePrice: number;
  volatilityScore?: number;
  confidence?: number;
  category?: SetupLevelCategory;
}): ComputedLevels {
  const price = Number(params.referencePrice);
  const category = params.category ?? "unknown";
  const volatilityScore = clampPercent(params.volatilityScore);
  const confidenceScore = clampPercent(params.confidence);
  const volNorm = volatilityScore / 100;
  const confNorm = confidenceScore / 100;
  const volFactor = clamp(0.5 + volNorm * 1.5, 0.5, 2.0);
  const stopFactor = clamp(1.3 - confNorm * 0.6, 0.7, 1.3);
  const targetFactor = clamp(1.0 + confNorm * 1.5, 1.0, 2.5);

  if (!Number.isFinite(price) || price <= 0) {
    badgeLogging(`invalid reference price (${params.referencePrice}) for direction ${params.direction}`);
    return {
      entryZone: null,
      stopLoss: null,
      takeProfit: null,
    debug: {
      bandPct: null,
      referencePrice: null,
      category,
      volatilityScore: null,
      scoreVolatility: null,
      volatilityFactor: null,
      stopFactor: null,
      targetFactor: null,
      confidenceScore: null,
      baseBand: null,
      volatilityScoreUsed: null,
      confidenceScoreUsed: null,
    },
      riskReward: {
        riskPercent: null,
        rewardPercent: null,
        rrr: null,
        volatilityLabel: null,
      },
    };
  }

  const baseBand = getBaseBandForCategory(category);
  const bandPctRaw = baseBand * volFactor;
  const bandPct = clamp(bandPctRaw, 0.001, 0.05);
  const stopBand = clamp(bandPct * stopFactor, 0.001, 0.03);
  const targetBand = clamp(bandPct * targetFactor, 0.001, 0.05);

  let entryLow = price;
  let entryHigh = price;
  let stopLossValue = price;
  let takeProfitValue = price;

  const direction = params.direction;

  const longStop = (mult: number) => price * (1 - stopBand * mult);
  const shortStop = (mult: number) => price * (1 + stopBand * mult);
  const longTarget = (mult: number) => price * (1 + targetBand * mult);
  const shortTarget = (mult: number) => price * (1 - targetBand * mult);

  switch (category) {
    case "pullback": {
      if (direction === "long") {
        entryLow = price * (1 - bandPct * 1.3);
        entryHigh = price * (1 - bandPct * 0.3);
        stopLossValue = longStop(2.0);
        takeProfitValue = longTarget(3.0);
      } else if (direction === "short") {
        entryLow = price * (1 + bandPct * 0.3);
        entryHigh = price * (1 + bandPct * 1.3);
        stopLossValue = shortStop(2.0);
        takeProfitValue = shortTarget(3.0);
      } else {
        entryLow = price * (1 - bandPct * 1.0);
        entryHigh = price * (1 + bandPct * 1.0);
        stopLossValue = longStop(2.0);
        takeProfitValue = longTarget(2.0);
      }
      break;
    }

    case "breakout": {
      if (direction === "long") {
        entryLow = price * (1 + bandPct * 0.2);
        entryHigh = price * (1 + bandPct * 1.2);
        stopLossValue = longStop(1.5);
        takeProfitValue = longTarget(3.0);
      } else if (direction === "short") {
        entryLow = price * (1 - bandPct * 1.2);
        entryHigh = price * (1 - bandPct * 0.2);
        stopLossValue = shortStop(1.5);
        takeProfitValue = shortTarget(3.0);
      } else {
        entryLow = price * (1 - bandPct * 0.5);
        entryHigh = price * (1 + bandPct * 0.5);
        stopLossValue = longStop(1.5);
        takeProfitValue = longTarget(1.5);
      }
      break;
    }

    case "range": {
      entryLow = price * (1 - bandPct * 0.6);
      entryHigh = price * (1 + bandPct * 0.6);
      if (direction === "short") {
        stopLossValue = shortStop(1.5);
        takeProfitValue = shortTarget(2.0);
      } else if (direction === "long") {
        stopLossValue = longStop(1.5);
        takeProfitValue = longTarget(2.0);
      } else {
        stopLossValue = longStop(1.2);
        takeProfitValue = longTarget(1.2);
      }
      break;
    }

    case "trendContinuation": {
      entryLow = price * (1 - bandPct * 0.4);
      entryHigh = price * (1 + bandPct * 0.4);
      if (direction === "short") {
        stopLossValue = shortStop(1.8);
        takeProfitValue = shortTarget(2.5);
      } else if (direction === "long") {
        stopLossValue = longStop(1.8);
        takeProfitValue = longTarget(2.5);
      } else {
        stopLossValue = longStop(1.4);
        takeProfitValue = longTarget(1.4);
      }
      break;
    }

    case "liquidityGrab": {
      if (direction === "long") {
        entryLow = price * (1 - bandPct * 1.8);
        entryHigh = price * (1 - bandPct * 0.8);
        stopLossValue = longStop(3.5);
        takeProfitValue = longTarget(3.5);
      } else if (direction === "short") {
        entryLow = price * (1 + bandPct * 0.8);
        entryHigh = price * (1 + bandPct * 1.8);
        stopLossValue = shortStop(3.5);
        takeProfitValue = shortTarget(3.5);
      } else {
        entryLow = price * (1 - bandPct * 1.2);
        entryHigh = price * (1 + bandPct * 1.2);
        stopLossValue = longStop(2.5);
        takeProfitValue = longTarget(2.5);
      }
      break;
    }

    case "unknown":
    default: {
      entryLow = price * (1 - bandPct / 2);
      entryHigh = price * (1 + bandPct / 2);
      if (direction === "short") {
        stopLossValue = shortStop(2);
        takeProfitValue = shortTarget(3);
      } else if (direction === "long") {
        stopLossValue = longStop(2);
        takeProfitValue = longTarget(3);
      } else {
        stopLossValue = longStop(1);
        takeProfitValue = longTarget(1);
      }
    }
  }

  const [finalEntryLow, finalEntryHigh] = ensureOrder([entryLow, entryHigh]);
  const precision = determinePrecision(price);
  const entryZoneText = `${formatPrice(finalEntryLow, precision)} - ${formatPrice(finalEntryHigh, precision)}`;
  const entryPrice = (finalEntryLow + finalEntryHigh) / 2;
  const riskReward = computeRiskReward({
    direction,
    entryPrice,
    stopLossValue,
    takeProfitValue,
    volatilityScore,
  });

  return {
    entryZone: entryZoneText,
    stopLoss: formatPrice(stopLossValue, precision),
    takeProfit: formatPrice(takeProfitValue, precision),
    debug: {
      bandPct,
      referencePrice: price,
      category,
      volatilityScore,
      scoreVolatility: params.volatilityScore ?? null,
      volatilityFactor: volFactor,
      stopFactor,
      targetFactor,
      confidenceScore,
      baseBand,
      volatilityScoreUsed: volatilityScore,
      confidenceScoreUsed: confidenceScore,
    },
    riskReward,
  };
}
