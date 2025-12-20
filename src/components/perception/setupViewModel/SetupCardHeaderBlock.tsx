"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";

type Props = {
  setup: SetupViewModel;
  generatedAtText?: string | null;
  timeframe?: string | null;
  typeLabel?: string | null;
  variant?: "full" | "compact";
};

export function SetupCardHeaderBlock({
  setup,
  generatedAtText,
  timeframe,
  typeLabel,
  variant = "full",
}: Props): JSX.Element {
  const t = useT();
  const meta = getAssetMeta(setup.assetId, setup.symbol);
  const headline = formatAssetLabel(setup.assetId, setup.symbol);
  const isLong = setup.direction === "Long";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-1">
        {variant === "full" ? (
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.35em] text-slate-300">
            {t("setups.setupOfTheDay")}
          </p>
        ) : null}
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {timeframe ? `${headline} · ${timeframe}` : headline}
        </h2>
        <p className={`text-4xl font-bold ${isLong ? "text-emerald-400" : "text-rose-400"}`}>
          {setup.direction}
        </p>
        <p className="text-sm text-slate-400">{meta.name}</p>
        {typeLabel ? (
          <span className="inline-flex w-fit rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
            {typeLabel}
          </span>
        ) : null}
      </div>
      {generatedAtText ? (
        <p className="text-xs text-slate-400 sm:text-right">{generatedAtText}</p>
      ) : null}
    </div>
  );
}
