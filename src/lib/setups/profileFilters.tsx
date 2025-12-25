"use client";

import Link from "next/link";
import type { JSX } from "react";
import type { ProfileFilter } from "@/src/lib/setups/profileFilter";

const DEFAULT_PROFILE_KEYS: ProfileFilter[] = ["all", "swing", "intraday", "position"];

export function ProfileFilters({
  basePath,
  selectedProfile,
  labels,
  keys,
}: {
  basePath: string;
  selectedProfile: ProfileFilter | null;
  labels: Record<ProfileFilter, string>;
  keys?: ProfileFilter[];
}): JSX.Element {
  const profileKeys = keys ?? DEFAULT_PROFILE_KEYS;
  const activeProfile = selectedProfile === "all" ? "swing" : selectedProfile ?? "swing";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {profileKeys.map((key) => {
        const isActive = activeProfile === key;
        const needsQueryParam = key !== "all" && key !== "swing";
        const href = needsQueryParam ? `${basePath}?profile=${key}` : basePath;
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
