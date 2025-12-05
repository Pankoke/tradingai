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
import { Tooltip } from "@/src/components/ui/tooltip";

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

type RrrClass = "conservative" | "balanced" | "aggressive";

function classifyRrr(rrr?: number | null): RrrClass | null {
  if (rrr === undefined || rrr === null || Number.isNaN(rrr)) {
    return null;
  }
  if (rrr < 1.3) return "conservative";
  if (rrr < 2.0) return "balanced";
  return "aggressive";
}

const classStyles: Record<RrrClass, string> = {
  conservative: "bg-rose-500/10 text-rose-300 border border-rose-500/30",
  balanced: "bg-amber-500/10 text-amber-300 border border-amber-500/30",
  aggressive: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
};

type RrrBucket = "weak" | "ok" | "strong";
type RiskBucket = "low" | "medium" | "high";

const bucketRrr = (rrr?: number | null): RrrBucket | null => {
  if (rrr === undefined || rrr === null || Number.isNaN(rrr)) return null;
  if (rrr < 1.5) return "weak";
  if (rrr < 3) return "ok";
  return "strong";
};

const bucketRisk = (riskPercent?: number | null): RiskBucket | null => {
  if (riskPercent === undefined || riskPercent === null || Number.isNaN(riskPercent)) return null;
  if (riskPercent <= 1.5) return "low";
  if (riskPercent <= 2.5) return "medium";
  return "high";
};

const bucketConfidence = (confidence?: number | null): "low" | "medium" | "high" | null => {
  if (confidence === undefined || confidence === null || Number.isNaN(confidence)) return null;
  if (confidence > 70) return "high";
  if (confidence >= 46) return "medium";
  return "low";
};

export function RiskRewardBlock({ riskReward, className }: Props): JSX.Element {
  const t = useT();
  const data = riskReward ?? {
    riskPercent: null,
    rewardPercent: null,
    rrr: null,
    volatilityLabel: null,
  };
  const volatilityDisplay =
    data.volatilityLabel != null ? formatVolatilityLabel(data.volatilityLabel) : t("perception.riskReward.valueNA");
  const rrrClass = classifyRrr(data.rrr);
  const rrrBucket = bucketRrr(data.rrr);
  const riskBucket = bucketRisk(data.riskPercent);
  const confidenceBucket = bucketConfidence(
    // optional passthrough when available on riskReward
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any)?.confidenceScore ?? null,
  );

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
            <Tooltip
              content={
                rrrBucket
                  ? t(`perception.riskReward.tooltip.rrr.${rrrBucket}`)
                      .replace("{rrr}", formatRRR(data.rrr))
                      .replace(
                        "{confidence}",
                        confidenceBucket ? t(`perception.rings.insights.confidence.${confidenceBucket}`) : "",
                      )
                  : t("perception.riskReward.tooltip.rrrDefault")
              }
              side="top"
            >
              <p className="flex cursor-help items-center gap-2 text-[0.55rem] uppercase tracking-[0.35em] text-slate-500">
                {t("perception.riskReward.rrrLabel")}
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-700 text-[0.55rem] text-slate-400">i</span>
              </p>
            </Tooltip>
            <p className={`text-3xl font-bold ${determineRRRColor(data.rrr)}`}>
              {formatRRR(data.rrr)}
            </p>
            {rrrClass && (
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-[0.15rem] text-[0.6rem] uppercase tracking-[0.25em] ${classStyles[rrrClass]}`}
              >
                {t(`perception.riskReward.rrrClass.${rrrClass}`)}
              </span>
            )}
            {rrrBucket ? (
              <p className="mt-1 text-[11px] text-slate-300">
                {t(`perception.riskReward.rrrNote.${rrrBucket}`).replace("{rrr}", formatRRR(data.rrr))}
              </p>
            ) : null}
          </div>
          <div className="h-2 w-[110px] rounded-full border border-slate-800 bg-slate-900">
            <div className={`h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 ${barWidth(data.rrr)}`} />
          </div>
        </div>

        <div className="grid gap-2 text-[0.7rem] sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-slate-300">
            <div className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-500">
              {t("perception.riskReward.rewardLabel")}
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
              {t("perception.riskReward.riskLabel")}
            </div>
            <div className="mt-1 text-sm font-semibold text-rose-400">
              {formatRiskPercent(data.riskPercent)}
            </div>
            {riskBucket ? (
              <p className="mt-1 text-[11px] text-slate-300">
                {t(`perception.riskReward.riskNote.${riskBucket}`)
                  .replace("{risk}", formatRiskPercent(data.riskPercent))
                  .replace("{rrr}", formatRRR(data.rrr))}
              </p>
            ) : null}
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full rounded-full bg-rose-500 ${barWidth(data.riskPercent)}`} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-slate-300">
            <Tooltip content={t("perception.riskReward.tooltip.volatility")} side="top">
              <div className="flex cursor-help items-center gap-2 text-[0.55rem] uppercase tracking-[0.3em] text-slate-500">
                {t("perception.riskReward.volatilityLabel")}
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-700 text-[0.55rem] text-slate-400">i</span>
              </div>
            </Tooltip>
            <div className="mt-1 flex items-center justify-between text-xs font-semibold">
              <span>{volatilityDisplay}</span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-[0.15rem] text-[0.6rem] tracking-[0.2em] text-slate-400">
                {data.volatilityLabel ?? t("perception.riskReward.valueNA")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
