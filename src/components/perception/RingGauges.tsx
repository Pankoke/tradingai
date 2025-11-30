"use client";

import { Tooltip } from "@/src/components/ui/tooltip";
import type { JSX } from "react";

type GaugeTone = "accent" | "green" | "teal" | "neutral";

export type SmallGaugeProps = {
  label?: string;
  value: number;
  tone?: GaugeTone;
  tooltip?: string;
};

export function SmallGauge({ label, value, tone = "accent", tooltip }: SmallGaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  const display = Math.round(clamped);
  const toneColor =
    tone === "green" ? "#22c55e" : tone === "teal" ? "#14b8a6" : tone === "neutral" ? "#475569" : "#0ea5e9";

  const gauge = (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${toneColor} ${clamped}%, rgba(226,232,240,0.15) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[68%] w-[68%] items-center justify-center rounded-full bg-slate-900">
          <span className="text-xs font-semibold text-white">{display}%</span>
        </div>
      </div>
      {label ? <span className="text-[0.7rem] text-slate-300">{label}</span> : null}
    </div>
  );

  return tooltip ? <Tooltip content={tooltip}>{gauge}</Tooltip> : gauge;
}

type BigGaugeProps = {
  value: number;
  label?: string;
  tooltip?: string;
};

export function BigGauge({ value, label, tooltip }: BigGaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  const display = Math.round(clamped);

  const gauge = (
    <div className="flex flex-col items-center gap-2 lg:items-end">
      <div
        className="relative flex h-36 w-36 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#22c55e ${clamped}%, rgba(226,232,240,0.15) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[68%] w-[68%] flex-col items-center justify-center rounded-full bg-slate-900 shadow-inner shadow-black/40">
          <span className="text-3xl font-bold text-white">{display}%</span>
          <span className="text-[0.65rem] text-slate-300">{label ?? "Confidence"}</span>
        </div>
      </div>
    </div>
  );

  return tooltip ? <Tooltip content={tooltip}>{gauge}</Tooltip> : gauge;
}
