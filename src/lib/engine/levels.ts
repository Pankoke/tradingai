import { clamp } from "@/src/lib/math";

type Direction = "long" | "short" | "neutral";

export interface ComputedLevels {
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
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

export function computeLevelsForSetup(params: {
  direction: Direction;
  referencePrice: number;
  volatilityScore?: number;
}): ComputedLevels {
  const price = Number(params.referencePrice);
  if (!Number.isFinite(price) || price <= 0) {
    badgeLogging(`invalid reference price (${params.referencePrice}) for direction ${params.direction}`);
    return {
      entryZone: "0 - 0",
      stopLoss: "0",
      takeProfit: "0",
    };
  }

  const vol = clampPercent(params.volatilityScore ?? 50);
  const baseBand = 0.005;
  const extraBand = (vol / 100) * 0.015;
  const bandPct = baseBand + extraBand;
  const entryLow = price * (1 - bandPct / 2);
  const entryHigh = price * (1 + bandPct / 2);

  let stopLossValue: number;
  let takeProfitValue: number;

  if (params.direction === "short") {
    stopLossValue = price * (1 + bandPct * 2);
    takeProfitValue = price * (1 - bandPct * 3);
  } else if (params.direction === "long") {
    stopLossValue = price * (1 - bandPct * 2);
    takeProfitValue = price * (1 + bandPct * 3);
  } else {
    stopLossValue = price * (1 - bandPct);
    takeProfitValue = price * (1 + bandPct);
  }

  const precision = determinePrecision(price);
  const entryPrecision = precision;
  const entryZoneText = `${formatPrice(entryLow, entryPrecision)} - ${formatPrice(entryHigh, entryPrecision)}`;

  return {
    entryZone: entryZoneText,
    stopLoss: formatPrice(stopLossValue, precision),
    takeProfit: formatPrice(takeProfitValue, precision),
  };
}
