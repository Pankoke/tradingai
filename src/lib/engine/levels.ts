import { clamp } from "@/src/lib/math";

type Direction = "long" | "short" | "neutral";

export type SetupLevelCategory =
  | "pullback"
  | "breakout"
  | "range"
  | "trendContinuation"
  | "liquidityGrab"
  | "unknown";

export interface ComputedLevels {
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  debug: {
    bandPct: number;
    referencePrice: number;
    category: SetupLevelCategory;
    volatilityScore: number;
  };
}

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

export function computeLevelsForSetup(params: {
  direction: Direction;
  referencePrice: number;
  volatilityScore?: number;
  category?: SetupLevelCategory;
}): ComputedLevels {
  const price = Number(params.referencePrice);
  const category = params.category ?? "unknown";
  const volatilityScore = clampPercent(params.volatilityScore ?? 50);
  if (!Number.isFinite(price) || price <= 0) {
    badgeLogging(`invalid reference price (${params.referencePrice}) for direction ${params.direction}`);
    return {
      entryZone: "0 - 0",
      stopLoss: "0",
      takeProfit: "0",
      debug: {
        bandPct: 0,
        referencePrice: price || 0,
        category,
        volatilityScore,
      },
    };
  }

  const baseBand = 0.005;
  const extraBand = (volatilityScore / 100) * 0.015;
  const bandPct = baseBand + extraBand;

  let entryLow = price;
  let entryHigh = price;
  let stopLossValue = price;
  let takeProfitValue = price;

  const direction = params.direction;

  switch (category) {
    case "pullback": {
      if (direction === "long") {
        entryLow = price * (1 - bandPct * 1.3);
        entryHigh = price * (1 - bandPct * 0.3);
        stopLossValue = price * (1 - bandPct * 2.0);
        takeProfitValue = price * (1 + bandPct * 3.0);
      } else if (direction === "short") {
        entryLow = price * (1 + bandPct * 0.3);
        entryHigh = price * (1 + bandPct * 1.3);
        stopLossValue = price * (1 + bandPct * 2.0);
        takeProfitValue = price * (1 - bandPct * 3.0);
      } else {
        entryLow = price * (1 - bandPct * 1.0);
        entryHigh = price * (1 + bandPct * 1.0);
        stopLossValue = price * (1 - bandPct * 2.0);
        takeProfitValue = price * (1 + bandPct * 2.0);
      }
      break;
    }

    case "breakout": {
      if (direction === "long") {
        entryLow = price * (1 + bandPct * 0.2);
        entryHigh = price * (1 + bandPct * 1.2);
        stopLossValue = price * (1 - bandPct * 1.5);
        takeProfitValue = price * (1 + bandPct * 3.0);
      } else if (direction === "short") {
        entryLow = price * (1 - bandPct * 1.2);
        entryHigh = price * (1 - bandPct * 0.2);
        stopLossValue = price * (1 + bandPct * 1.5);
        takeProfitValue = price * (1 - bandPct * 3.0);
      } else {
        entryLow = price * (1 - bandPct * 0.5);
        entryHigh = price * (1 + bandPct * 0.5);
        stopLossValue = price * (1 - bandPct * 1.5);
        takeProfitValue = price * (1 + bandPct * 1.5);
      }
      break;
    }

    case "range": {
      entryLow = price * (1 - bandPct * 0.6);
      entryHigh = price * (1 + bandPct * 0.6);
      if (direction === "short") {
        stopLossValue = price * (1 + bandPct * 1.5);
        takeProfitValue = price * (1 - bandPct * 2.0);
      } else if (direction === "long") {
        stopLossValue = price * (1 - bandPct * 1.5);
        takeProfitValue = price * (1 + bandPct * 2.0);
      } else {
        stopLossValue = price * (1 - bandPct * 1.2);
        takeProfitValue = price * (1 + bandPct * 1.2);
      }
      break;
    }

    case "trendContinuation": {
      entryLow = price * (1 - bandPct * 0.4);
      entryHigh = price * (1 + bandPct * 0.4);
      if (direction === "short") {
        stopLossValue = price * (1 + bandPct * 1.8);
        takeProfitValue = price * (1 - bandPct * 2.5);
      } else if (direction === "long") {
        stopLossValue = price * (1 - bandPct * 1.8);
        takeProfitValue = price * (1 + bandPct * 2.5);
      } else {
        stopLossValue = price * (1 - bandPct * 1.4);
        takeProfitValue = price * (1 + bandPct * 1.4);
      }
      break;
    }

    case "liquidityGrab": {
      if (direction === "long") {
        entryLow = price * (1 - bandPct * 1.8);
        entryHigh = price * (1 - bandPct * 0.8);
        stopLossValue = price * (1 - bandPct * 3.5);
        takeProfitValue = price * (1 + bandPct * 3.5);
      } else if (direction === "short") {
        entryLow = price * (1 + bandPct * 0.8);
        entryHigh = price * (1 + bandPct * 1.8);
        stopLossValue = price * (1 + bandPct * 3.5);
        takeProfitValue = price * (1 - bandPct * 3.5);
      } else {
        entryLow = price * (1 - bandPct * 1.2);
        entryHigh = price * (1 + bandPct * 1.2);
        stopLossValue = price * (1 - bandPct * 2.5);
        takeProfitValue = price * (1 + bandPct * 2.5);
      }
      break;
    }

    case "unknown":
    default: {
      entryLow = price * (1 - bandPct / 2);
      entryHigh = price * (1 + bandPct / 2);
      if (direction === "short") {
        stopLossValue = price * (1 + bandPct * 2);
        takeProfitValue = price * (1 - bandPct * 3);
      } else if (direction === "long") {
        stopLossValue = price * (1 - bandPct * 2);
        takeProfitValue = price * (1 + bandPct * 3);
      } else {
        stopLossValue = price * (1 - bandPct);
        takeProfitValue = price * (1 + bandPct);
      }
    }
  }

  const [finalEntryLow, finalEntryHigh] = ensureOrder([entryLow, entryHigh]);
  const precision = determinePrecision(price);
  const entryZoneText = `${formatPrice(finalEntryLow, precision)} - ${formatPrice(finalEntryHigh, precision)}`;

  return {
    entryZone: entryZoneText,
    stopLoss: formatPrice(stopLossValue, precision),
    takeProfit: formatPrice(takeProfitValue, precision),
    debug: {
      bandPct,
      referencePrice: price,
      category,
      volatilityScore,
    },
  };
}
