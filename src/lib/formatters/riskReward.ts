"use client";

import type { VolatilityLabel } from "@/src/lib/engine/types";

export function formatSignedPercent(value?: number | null, decimals = 1): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${Math.abs(value).toFixed(decimals)}%`;
}

export function formatRiskPercent(value?: number | null, decimals = 1): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `-${Math.abs(value).toFixed(decimals)}%`;
}

export function formatRewardPercent(value?: number | null, decimals = 1): string {
  return formatSignedPercent(value, decimals);
}

export function formatRRR(value?: number | null, decimals = 1): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${value.toFixed(decimals)} : 1`;
}

export function formatVolatilityLabel(label?: VolatilityLabel | null): string {
  if (!label) {
    return "n/a";
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
}
