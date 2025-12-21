"use client";

import React from "react";
import type { JSX } from "react";
import clsx from "clsx";
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

type StatTileProps = { label: string; value: string; tone?: "neutral" | "positive" | "negative" };

function StatTile({ label, value, tone = "neutral" }: StatTileProps): JSX.Element {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-rose-300"
        : "text-slate-200";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-slate-300 shadow-[0_10px_28px_rgba(15,23,42,0.55)]">
      <div className="text-[0.55rem] uppercase tracking-[0.3em] text-slate-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

const bucketRrr = (rrr?: number | null): RrrBucket | null => {
  if (rrr === undefined || rrr === null || Number.isNaN(rrr)) return null;
  if (rrr < 2) return "weak";
  if (rrr < 3) return "ok";
  return "strong";
};

const bucketRisk = (riskPercent?: number | null): RiskBucket | null => {
  if (riskPercent === undefined || riskPercent === null || Number.isNaN(riskPercent)) return null;
  if (riskPercent <= 1.2) return "low";
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
  const confidenceScore =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (data as any)?.confidenceScore === "number" ? (data as any).confidenceScore as number : null;
  const chips: string[] = [];
  chips.push(`${t("perception.riskReward.volatilityLabel")}: ${volatilityDisplay}`);
  if (confidenceScore !== null) {
    chips.push(t("perception.execution.chip.confidence").replace("{value}", String(Math.round(confidenceScore))));
  }
  if (riskBucket) {
    chips.push(t(`perception.riskReward.riskChip.${riskBucket}`));
  }

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-[#0f172a]/80 px-4 py-4 shadow-[inset_0_0_25px_rgba(15,23,42,0.9)] ${className ?? ""}`}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Tooltip
              content={
                rrrBucket
                  ? `${t(`perception.riskReward.tooltip.rrr.${rrrBucket}`)
                      .replace("{rrr}", formatRRR(data.rrr))
                      .replace(
                        "{confidence}",
                        confidenceBucket ? t(`perception.rings.insights.confidence.${confidenceBucket}`) : "",
                      )}`
                  : t("perception.riskReward.tooltip.rrrDefault")
              }
              side="top"
            >
              <p className="flex cursor-help items-center gap-2 text-[0.55rem] uppercase tracking-[0.35em] text-slate-500">
                {t("perception.riskReward.rrrLabel")}
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-700 text-[0.55rem] text-slate-400">
                  i
                </span>
              </p>
            </Tooltip>
            <div className="flex items-baseline gap-3">
              <p className={`text-4xl font-bold ${determineRRRColor(data.rrr)}`}>{formatRRR(data.rrr)}</p>
              {rrrClass && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${classStyles[rrrClass]}`}>
                  {t(`perception.riskReward.rrrClass.${rrrClass}`)}
                </span>
              )}
            </div>
            {rrrBucket ? (
              <p className="mt-1 text-xs text-slate-300">
                {t(`perception.riskReward.rrrNote.${rrrBucket}`).replace("{rrr}", formatRRR(data.rrr))}
              </p>
            ) : null}
          </div>
          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-[0.2em] text-slate-300">
              {chips.map((chip) => (
                <span key={chip} className="rounded-full border border-slate-700/60 px-3 py-1 text-slate-200">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <StatTile
            label={t("perception.riskReward.rewardToTarget.label")}
            value={formatRewardPercent(data.rewardPercent)}
            tone="positive"
          />
          <StatTile
            label={t("perception.riskReward.riskToStop.label")}
            value={formatRiskPercent(data.riskPercent)}
            tone="negative"
          />
        </div>
      </div>
    </div>
  );
}
