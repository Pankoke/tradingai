"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

export type RingInspectorVariant = "full" | "compact";

export type RingInspectorLayoutProps = {
  title: string;
  scoreLabel?: string;
  scoreTone?: "high" | "medium" | "low" | "neutral" | "danger";
  summary?: string;
  children?: ReactNode;
  variant?: RingInspectorVariant;
  className?: string;
  emptyState?: string;
};

const toneClasses: Record<
  NonNullable<RingInspectorLayoutProps["scoreTone"]>,
  string
> = {
  high: "border-emerald-500/70 bg-emerald-500/10 text-emerald-200",
  medium: "border-amber-500/70 bg-amber-500/10 text-amber-200",
  low: "border-slate-700 bg-slate-900 text-slate-300",
  neutral: "border-slate-700 bg-slate-900 text-slate-300",
  danger: "border-rose-600/70 bg-rose-600/10 text-rose-200",
};

export function RingInspectorLayout({
  title,
  scoreLabel,
  scoreTone = "neutral",
  summary,
  children,
  variant = "full",
  className,
  emptyState,
}: RingInspectorLayoutProps) {
  const showEmpty = !children && !summary && emptyState;
  return (
    <section
      className={clsx(
        "rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.4)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          {title}
        </p>
        {scoreLabel && (
          <span
            className={clsx(
              "rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.2em]",
              toneClasses[scoreTone],
            )}
          >
            {scoreLabel}
          </span>
        )}
      </div>
      {summary && (
        <p
          className={clsx(
            "mt-3 text-sm",
            variant === "compact" ? "text-slate-300" : "text-slate-200",
          )}
        >
          {summary}
        </p>
      )}
      {children && (
        <div className="mt-4 text-sm text-slate-200">{children}</div>
      )}
      {showEmpty && (
        <p className="mt-3 text-sm text-slate-500">{emptyState}</p>
      )}
    </section>
  );
}
