"use client";

import type { JSX, ReactNode } from "react";

type PerceptionCardProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

export function PerceptionCard({
  children,
  className = "",
  innerClassName = "",
}: PerceptionCardProps): JSX.Element {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-[1.5px] shadow-sm dark:border-transparent dark:from-sky-500/15 dark:via-transparent dark:to-emerald-500/10 dark:shadow-[0_0_25px_rgba(56,189,248,0.15)] ${className}`}
    >
      <div
        className={`rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_rgba(4,7,15,0.98)] px-5 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] md:px-8 md:py-8 ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
