"use client";

import type { JSX, ReactNode } from "react";

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "bottom";
  className?: string;
};

const SIDE_CLASSES: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
};

export function Tooltip({ children, content, side = "top", className = "" }: TooltipProps): JSX.Element {
  return (
    <div className="group relative inline-flex">
      {children}
      <div
        className={`pointer-events-none absolute z-10 w-max max-w-xs rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-1 text-xs text-slate-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 backdrop-blur ${SIDE_CLASSES[side]} ${className}`}
      >
        {content}
      </div>
    </div>
  );
}
