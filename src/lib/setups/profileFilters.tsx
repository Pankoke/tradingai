"use client";

import Link from "next/link";
import type { JSX } from "react";

export function ProfileFilters({
  basePath,
  selectedProfile,
  labels,
}: {
  basePath: string;
  selectedProfile: string | null;
  labels: Record<"all" | "swing" | "intraday" | "position", string>;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["all", "swing", "intraday", "position"] as const).map((key) => {
        const isActive = selectedProfile === key;
        const href = key === "all" ? basePath : `${basePath}?profile=${key}`;
        const label = labels[key];
        return (
          <Link
            key={key}
            href={href}
            replace
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
              isActive
                ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100"
                : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
