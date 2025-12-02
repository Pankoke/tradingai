"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { RiskRewardSummary } from "@/src/lib/engine/levels";
import {
  formatRRR,
  formatRewardPercent,
  formatRiskPercent,
  formatVolatilityLabel,
} from "@/src/lib/formatters/riskReward";

type Props = {
  riskReward?: RiskRewardSummary | null;
  className?: string;
};

const determineRRRColor = (value?: number | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return "text-slate-400";
  if (value < 1.0) return "text-rose-400";
  if (value < 2.0) return "text-amber-300";
  return "text-emerald-400";
};

const barWidth = (value?: number | null): string => {
  if (!value || !Number.isFinite(value)) {
    return "w-[35%]";
  }
  const pct = Math.min(Math.abs(value), 20);
  return `w-[${Math.round(pct * 2.5)}%]`;
};

export function RiskRewardBlock({ riskReward, className }: Props): JSX.Element {
  const t = useT();
  const data = riskReward ?? {
    riskPercent: null,
    rewardPercent: null,
    rrr: null,
    volatilityLabel: null,
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-[#0f172a]/80 px-4 py-4 shadow-[inset_0_0_25px_rgba(15,23,42,0.9)] ${className ?? ""}`}
    >
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
        {t("perception.riskReward.title")}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.35em] text-slate-500">
              {t("perception.riskReward.rrr")}
            </p>
            <p className={`text-3xl font-bold ${determineRRRColor(data.rrr)}`}>
              {formatRRR(data.rrr)}
            </p>
          </div>
          <div className="h-2 w-[110px] rounded-full border border-slate-800 bg-slate-900">
            <div className={`h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 ${barWidth(data.rrr)}`} />
          </div>
        </div>

        <div className="grid gap-2 text-[0.7rem] sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-slate-300">
            <div className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-500">
              {t("perception.riskReward.reward")}
            </div>
            <div className="mt-1 text-sm font-semibold text-emerald-400">
              {formatRewardPercent(data.rewardPercent)}
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full bg-emerald-400 ${barWidth(data.rewardPercent)}`} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-slate-300">
            <div className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-500">
              {t("perception.riskReward.risk")}
            </div>
            <div className="mt-1 text-sm font-semibold text-rose-400">
              {formatRiskPercent(data.riskPercent)}
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full bg-rose-500 ${barWidth(data.riskPercent)}`} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-slate-300">
            <div className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-500">
              {t("perception.riskReward.volatility")}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs font-semibold">
              <span>{formatVolatilityLabel(data.volatilityLabel)}</span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-[0.15rem] text-[0.6rem] tracking-[0.2em] text-slate-400">
                {data.volatilityLabel ?? "n/a"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
