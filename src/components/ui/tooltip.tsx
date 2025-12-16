"use client";

import type { JSX, ReactNode } from "react";

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "bottom";
  className?: string;
  contentClassName?: string;
};

export function Tooltip({
  children,
  content,
  side = "top",
  className = "",
  contentClassName = "",
}: TooltipProps): JSX.Element {
  return (
    <div className="group relative inline-flex">
      {children}
      <div
        className={`pointer-events-none absolute left-1/2 ${
          side === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
        } -translate-x-1/2 whitespace-pre-line rounded-md bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 z-40 ${className}`}
      >
        <div className={`max-w-[420px] min-w-[280px] break-words ${contentClassName}`}>
          {content}
        </div>
      </div>
    </div>
  );
}
