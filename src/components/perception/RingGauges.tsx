"use client";

import { Tooltip } from "@/src/components/ui/tooltip";
import type { JSX, ReactNode } from "react";
import clsx from "clsx";

type GaugeTone = "accent" | "green" | "teal" | "neutral";

export type SmallGaugeProps = {
  label?: string;
  value: number;
  tone?: GaugeTone;
  tooltip?: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
};

export function SmallGauge({
  label,
  value,
  tone = "accent",
  tooltip,
  isActive = false,
  onClick,
  className,
}: SmallGaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  const display = Math.round(clamped);
  const toneColor =
    tone === "green" ? "#22c55e" : tone === "teal" ? "#14b8a6" : tone === "neutral" ? "#475569" : "#0ea5e9";

  const gaugeInner = (
    <>
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
    </>
  );

  const content = (
    <div
      className={clsx(
        "flex flex-col items-center gap-2 rounded-2xl border border-transparent px-2 py-2 transition",
        onClick && "cursor-pointer focus-within:outline-none focus-visible:outline-none",
        isActive && "border-sky-500/70 bg-slate-800/60 shadow-[0_10px_30px_rgba(15,23,42,0.4)]",
        !isActive && onClick && "hover:border-slate-700/70 hover:bg-slate-800/30",
        className,
      )}
    >
      {gaugeInner}
    </div>
  );

  const interactive = onClick
    ? (
      <button
        type="button"
        onClick={onClick}
        className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        aria-pressed={isActive}
      >
        {content}
      </button>
    )
    : content;

  return tooltip ? <Tooltip content={tooltip}>{interactive}</Tooltip> : interactive;
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
