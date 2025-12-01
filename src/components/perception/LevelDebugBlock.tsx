"use client";

import React from "react";
import type { JSX } from "react";

type LevelDebugBlockProps = {
  category?: string | null;
  referencePrice?: number | null;
  bandPct?: number | null;
  volatilityScore?: number | null;
  entryZone?: string | null;
  stopLoss?: string | null;
  takeProfit?: string | null;
  scoreVolatility?: number | null;
  rings?: Record<string, number>;
};

function formatNumeric(value?: number | null, decimals = 4): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(decimals);
}

export function LevelDebugBlock({
  category,
  referencePrice,
  bandPct,
  volatilityScore,
  scoreVolatility,
  entryZone,
  stopLoss,
  takeProfit,
  rings,
}: LevelDebugBlockProps): JSX.Element | null {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) {
    return null;
  }

  const ringPayload = rings ? JSON.stringify(rings) : "-";

  return (
    <div className="mt-3 rounded-md border border-yellow-700 bg-yellow-950/40 p-3 text-xs text-yellow-200">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-300">DEBUG</p>
      <div className="mt-1 space-y-0.5">
        <div>Category: {category ?? "Unknown"}</div>
        <div>Reference Price: {formatNumeric(referencePrice)}</div>
        <div>Band %: {formatNumeric(bandPct)}</div>
        <div>Volatility Score: {formatNumeric(volatilityScore)}</div>
        <div>Score Volatility: {formatNumeric(scoreVolatility)}</div>
        <div>Entry Zone: {entryZone ?? "n/a"}</div>
        <div>Stop Loss: {stopLoss ?? "n/a"}</div>
        <div>Take Profit: {takeProfit ?? "n/a"}</div>
        <div>Rings: {ringPayload}</div>
      </div>
    </div>
  );
}
