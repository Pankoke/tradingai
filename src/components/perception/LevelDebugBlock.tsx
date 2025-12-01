"use client";

import React from "react";
import type { JSX } from "react";

type LevelDebugBlockProps = {
  category?: string | null;
  referencePrice?: number | null;
  bandPct?: number | null;
  volatilityScore?: number | null;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  scoreVolatility?: number | null;
  rings?: Record<string, number>;
};

function formatNumeric(value?: number | null, decimals = 4): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "-";
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
        <div>Category: {category ?? "unknown"}</div>
        <div>Reference Price: {formatNumeric(referencePrice)}</div>
        <div>Band %: {bandPct !== undefined && bandPct !== null ? formatNumeric(bandPct, 4) : "-"}</div>
        <div>Volatility Score: {formatNumeric(volatilityScore)}</div>
        <div>Score Volatility: {formatNumeric(scoreVolatility)}</div>
        <div>Entry Zone: {entryZone}</div>
        <div>Stop Loss: {stopLoss}</div>
        <div>Take Profit: {takeProfit}</div>
        <div>Rings: {ringPayload}</div>
      </div>
    </div>
  );
}
