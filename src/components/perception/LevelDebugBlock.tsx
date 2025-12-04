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
  snapshotId?: string | null;
  snapshotCreatedAt?: string | null;
  eventContext?: {
    topEvents?: Array<{
      id?: string;
      title?: string;
      severity?: string;
      scheduledAt?: string;
      source?: string;
    }> | null;
  } | null;
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
  snapshotId,
  snapshotCreatedAt,
  eventContext,
}: LevelDebugBlockProps): JSX.Element | null {
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev) {
    return null;
  }

  const parsedSnapshotDate = snapshotCreatedAt ? new Date(snapshotCreatedAt) : null;
  const formattedSnapshotDate =
    parsedSnapshotDate && Number.isFinite(parsedSnapshotDate.getTime())
      ? parsedSnapshotDate.toLocaleString()
      : "n/a";

  const ringPayload = rings ? JSON.stringify(rings) : "-";
  const topEvents = eventContext?.topEvents ?? null;

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
        <div>Snapshot: {snapshotId ?? "n/a"}</div>
        <div>Snapshot created: {formattedSnapshotDate}</div>
        <div>Rings: {ringPayload}</div>
        <div className="pt-1">
          <div className="font-semibold text-yellow-100">Events (debug):</div>
          {topEvents && topEvents.length ? (
            <ul className="list-disc list-inside space-y-0.5">
              {topEvents.map((ev) => (
                <li key={`${ev.id ?? ev.title ?? "ev"}`}>
                  {ev.title ?? "n/a"} [{ev.severity ?? "n/a"}] –{" "}
                  {ev.scheduledAt
                    ? new Date(ev.scheduledAt).toLocaleString()
                    : "n/a"}
                </li>
              ))}
            </ul>
          ) : (
            <div>none</div>
          )}
        </div>
      </div>
    </div>
  );
}
