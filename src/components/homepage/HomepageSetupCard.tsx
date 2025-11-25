"use client";

import React from "react";
import type { JSX } from "react";
import { Badge } from "@/src/components/ui/badge";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { clamp } from "@/src/lib/math";

type RingProps = { value: number; label: string; color: string };

function Ring({ value, label, color }: RingProps): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-1" title={label || undefined}>
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-900/60"
        style={{
          backgroundImage: `conic-gradient(${color} ${clamp(value, 0, 100)}%, #e2e8f0 ${clamp(value, 0, 100)}%)`,
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-inner shadow-slate-300/60 dark:bg-slate-950/80 dark:shadow-black/30">
          <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
            {clamp(value, 0, 100)}%
          </span>
        </div>
      </div>
      {label ? <p className="text-[10px] text-slate-600 dark:text-slate-300">{label}</p> : null}
    </div>
  );
}

type Props = {
  setup: HomepageSetup;
  weakLabel: string;
  labels: {
    directionLong: string;
    directionShort: string;
    confidence: string;
    entry: string;
    take: string;
    stop: string;
    eventHigh: string;
    eventMedium: string;
    eventLow: string;
    sourceRuleBased: string;
    biasBullish: string;
    biasBearish: string;
    biasNeutral: string;
    sentimentPositive: string;
    sentimentNegative: string;
    sentimentNeutral: string;
    orderflowBuyers: string;
    orderflowSellers: string;
    orderflowBalanced: string;
  };
};

export default function HomepageSetupCard({ setup, weakLabel, labels }: Props): JSX.Element {
  const confidence = clamp(setup.confidence, 0, 100);
  const eventLabel =
    setup.eventLevel === "high"
      ? labels.eventHigh
      : setup.eventLevel === "medium"
        ? labels.eventMedium
        : labels.eventLow;
  const biasLabel =
    setup.bias.direction === "Bullish"
      ? labels.biasBullish
      : setup.bias.direction === "Bearish"
        ? labels.biasBearish
        : labels.biasNeutral;
  const sentimentLabel =
    setup.sentimentScore > 0.2
      ? labels.sentimentPositive
      : setup.sentimentScore < -0.2
        ? labels.sentimentNegative
        : labels.sentimentNeutral;
  const orderflowLabel =
    setup.orderflowMode === "buyers_dominant"
      ? labels.orderflowBuyers
      : setup.orderflowMode === "sellers_dominant"
        ? labels.orderflowSellers
        : labels.orderflowBalanced;
  const eventPercent = setup.eventLevel === "high" ? 85 : setup.eventLevel === "medium" ? 60 : 35;
  const biasPercent = clamp(setup.bias.strength, 0, 100);
  const sentimentPercent = clamp(Math.round(((setup.sentimentScore + 1) / 2) * 100), 0, 100);
  const orderflowPercent =
    setup.orderflowMode === "buyers_dominant" ? 80 : setup.orderflowMode === "sellers_dominant" ? 30 : 55;

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-none dark:hover:border-slate-600 dark:hover:bg-slate-900/90">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-slate-500">{labels.sourceRuleBased}</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {setup.symbol} · {setup.timeframe}
          </p>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
            <Badge
              className={`inline-flex items-center rounded-full border px-2 py-1 ${
                setup.direction === "Long"
                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
              }`}
            >
              {setup.direction === "Long" ? labels.directionLong : labels.directionShort}
            </Badge>
            {setup.weakSignal ? (
              <Badge className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                {weakLabel}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-600 dark:text-slate-500">{labels.confidence}</p>
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 shadow-inner shadow-slate-300/60 dark:bg-slate-900/60 dark:shadow-black/20"
            style={{
              backgroundImage: `conic-gradient(#22c55e ${confidence}%, #e2e8f0 ${confidence}%)`,
            }}
            title={`${Math.round(confidence)}% ${labels.confidence}`}
          >
            <div className="flex h-13 w-13 items-center justify-center rounded-full bg-white dark:bg-slate-950/90">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{Math.round(confidence)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 text-xs text-slate-700 dark:text-slate-200 md:grid-cols-4">
        <Ring value={eventPercent} label={eventLabel} color="#38bdf8" />
        <Ring value={biasPercent} label={biasLabel} color="#22c55e" />
        <Ring value={sentimentPercent} label={sentimentLabel} color="#10b981" />
        <Ring value={orderflowPercent} label={orderflowLabel} color="#22d3ee" />
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-600 dark:text-slate-500">{labels.entry}</p>
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            {setup.entryZone.from.toFixed(4)} - {setup.entryZone.to.toFixed(4)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-600 dark:text-slate-500">{labels.take}</p>
          <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{setup.takeProfit.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-600 dark:text-slate-500">{labels.stop}</p>
          <p className="text-base font-semibold text-rose-600 dark:text-rose-400">{setup.stopLoss.toFixed(4)}</p>
        </div>
      </div>
    </div>
  );
}
