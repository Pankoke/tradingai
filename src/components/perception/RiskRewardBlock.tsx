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
      className={`rounded-2xl border border-slate-800 bg-[#0f172a]/80 px-4 py-3 shadow-[inset_0_0_25px_rgba(15,23,42,0.9)] ${className ?? ""}`}
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
        {t("perception.riskReward.title")}
      </p>
      <div className="mt-2 space-y-1 text-[0.7rem] text-slate-300">
        <div className="flex items-center justify-between">
          <span>{t("perception.riskReward.rrr")}</span>
          <span className="font-semibold text-white">{formatRRR(data.rrr)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("perception.riskReward.reward")}</span>
          <span className="font-semibold text-emerald-400">{formatRewardPercent(data.rewardPercent)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("perception.riskReward.risk")}</span>
          <span className="font-semibold text-rose-400">{formatRiskPercent(data.riskPercent)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("perception.riskReward.volatility")}</span>
          <span className="font-semibold text-slate-100">{formatVolatilityLabel(data.volatilityLabel)}</span>
        </div>
      </div>
    </div>
  );
}
