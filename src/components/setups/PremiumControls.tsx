"use client";

import React from "react";
import type { JSX } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { AssetOption } from "@/src/components/setups/premiumHelpers";

type PremiumControlsProps = {
  currentSort: string;
  currentDir: string;
  currentFilter: string;
  currentAsset?: string | null;
  assets: AssetOption[];
};

export function PremiumControls({ currentSort, currentDir, currentFilter, currentAsset = "all", assets }: PremiumControlsProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useT();

  const updateParam = (key: string, value: string | null): void => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value && value.length > 0) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const toggleAsset = (symbol: string): void => {
    if (!symbol || symbol === "all") {
      updateParam("asset", null);
      return;
    }
    if (symbol === currentAsset) {
      updateParam("asset", null);
      return;
    }
    updateParam("asset", symbol);
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
          <option value="signal_quality">{t("premium.sort.signalQuality")}</option>
          <option value="confidence">{t("premium.sort.confidence")}</option>
          <option value="risk_reward">{t("premium.sort.rrr")}</option>
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

      {assets.length > 0 ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--text-primary)]">{t("premium.assets.quickSelect")}</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleAsset("all")}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                !currentAsset || currentAsset === "all"
                  ? "border-[var(--border-strong)] bg-[var(--bg-main)] text-[var(--text-primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              {t("premium.assets.all")}
            </button>
            {assets.map(({ symbol, display }) => {
              const active = currentAsset === symbol;
              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => toggleAsset(symbol)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-[var(--border-strong)] bg-[var(--bg-main)] text-[var(--text-primary)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  }`}
                  title={symbol}
                  aria-pressed={active}
                >
                  {display}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
