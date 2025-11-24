"use client";

import React from "react";
import type { JSX } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/lib/i18n/ClientProvider";

type PremiumControlsProps = {
  currentSort: string;
  currentDir: string;
  currentFilter: string;
};

export function PremiumControls({ currentSort, currentDir, currentFilter }: PremiumControlsProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useT();

  const updateParam = (key: string, value: string): void => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set(key, value);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[var(--text-primary)]">{t("premium.sort")}</label>
        <select
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2 py-1 text-sm"
        >
          <option value="confidence">{t("premium.sort.confidence")}</option>
          <option value="sentiment">{t("premium.sort.sentiment")}</option>
          <option value="timeframe">{t("premium.sort.timeframe")}</option>
          <option value="direction">{t("premium.sort.direction")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[var(--text-primary)]">Dir</label>
        <select
          value={currentDir}
          onChange={(e) => updateParam("dir", e.target.value)}
          className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2 py-1 text-sm"
        >
          <option value="asc">ASC</option>
          <option value="desc">DESC</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[var(--text-primary)]">{t("premium.filter")}</label>
        <select
          value={currentFilter}
          onChange={(e) => updateParam("filter", e.target.value)}
          className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2 py-1 text-sm"
        >
          <option value="all">{t("premium.filter.all")}</option>
          <option value="long">{t("premium.filter.long")}</option>
          <option value="short">{t("premium.filter.short")}</option>
        </select>
      </div>
    </div>
  );
}
