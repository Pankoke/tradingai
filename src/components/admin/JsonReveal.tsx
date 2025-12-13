"use client";

import { useState, type JSX } from "react";
import clsx from "clsx";

type JsonRevealProps = {
  data: unknown;
  showLabel: string;
  hideLabel: string;
  className?: string;
};

export function JsonReveal({ data, showLabel, hideLabel, className }: JsonRevealProps): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx("space-y-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-100"
      >
        {open ? hideLabel : showLabel}
      </button>
      {open && (
        <pre className="max-h-64 overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
