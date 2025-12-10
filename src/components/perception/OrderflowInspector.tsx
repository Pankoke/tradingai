"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

type OrderflowInspectorProps = {
  setup: Setup;
  variant?: "full" | "compact";
};

const scoreLabel = {
  weak: "perception.orderflow.score.weak",
  neutral: "perception.orderflow.score.neutral",
  supportive: "perception.orderflow.score.supportive",
  strong: "perception.orderflow.score.strong",
} as const;

const flagLabelMap: Record<string, string> = {
  trend_alignment: "perception.orderflow.flags.trend_alignment",
  trend_conflict: "perception.orderflow.flags.trend_conflict",
  volume_surge: "perception.orderflow.flags.volume_surge",
  volume_dry: "perception.orderflow.flags.volume_dry",
  expansion: "perception.orderflow.flags.expansion",
  choppy: "perception.orderflow.flags.choppy",
  orderflow_trend_alignment: "perception.orderflow.flags.trend_alignment",
  orderflow_bias_alignment: "perception.orderflow.flags.trend_alignment",
  orderflow_trend_conflict: "perception.orderflow.flags.trend_conflict",
  orderflow_bias_conflict: "perception.orderflow.flags.trend_conflict",
  high_risk_crowded: "perception.orderflow.flags.volume_surge",
};

const alignmentFlags = new Set<string>(["orderflow_trend_alignment", "orderflow_bias_alignment"]);
const conflictFlags = new Set<string>(["orderflow_trend_conflict", "orderflow_bias_conflict"]);

const modeLabelMap: Record<string, string> = {
  buyers: "perception.orderflow.mode.buyers",
  sellers: "perception.orderflow.mode.sellers",
  balanced: "perception.orderflow.mode.balanced",
};

function getScoreTier(score: number): keyof typeof scoreLabel {
  if (score >= 80) return "strong";
  if (score >= 60) return "supportive";
  if (score >= 40) return "neutral";
  return "weak";
}

export function OrderflowInspector({ setup, variant = "full" }: OrderflowInspectorProps): JSX.Element | null {
  const t = useT();
  const orderflow = setup.orderflow;
  const score = orderflow?.score;

  if (!score || !orderflow) {
    return null;
  }

  const tier = getScoreTier(score);
  const modeKey = orderflow.mode ?? setup.orderflowMode ?? "balanced";
  const modeLabel = modeLabelMap[modeKey] ?? modeLabelMap.balanced;

  const reasons = orderflow.reasonDetails ?? [];
  const displayedReasons = reasons.slice(0, variant === "full" ? 3 : 1);
  const flags = orderflow.flags ?? [];
  const delta = orderflow.confidenceDelta;

  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.9)] ${
        variant === "compact" ? "space-y-2" : "space-y-4"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{t("perception.orderflow.title")}</p>
          <p className="text-sm text-slate-200">{t(scoreLabel[tier])}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-white">{Math.round(score)}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">/100</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full border border-slate-800 bg-slate-950/40 px-2 py-0.5 text-xs font-semibold text-slate-300">
          {t(modeLabel)}
        </span>
        {delta !== null && delta !== undefined && (
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${delta >= 0 ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-rose-500/60 bg-rose-500/10 text-rose-300"}`}
          >
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} {t("perception.orderflow.confidenceDelta")}
          </span>
        )}
      </div>

      {variant === "full" && displayedReasons.length > 0 && (
        <div className="space-y-1">
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-500">{t("perception.orderflow.reasonsTitle")}</p>
          <div className="space-y-1">
            {displayedReasons.map((reason, idx) => (
              <div key={`${reason.category}-${idx}`} className="flex items-center justify-between gap-2 text-xs text-slate-200">
                <span className="text-slate-400">{t(`perception.orderflow.category.${reason.category}`) ?? reason.category}</span>
                <span>{reason.text}</span>
                <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {t("perception.orderflow.reasonLabel.default")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

            {flags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {flags.map((flag) => {
                  const isAlignment = alignmentFlags.has(flag);
                  const isConflict = conflictFlags.has(flag);
                  const isHighRisk = flag === "high_risk_crowded";
                  return (
                    <span
                      key={flag}
                      className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] ${
                        isAlignment
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                          : isConflict
                          ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                          : isHighRisk
                          ? "border-rose-500/60 bg-rose-500/10 text-rose-300"
                          : "border-slate-700 bg-slate-800 text-slate-200"
                      }`}
                    >
                      {t(flagLabelMap[flag] ?? `perception.orderflow.flags.${flag}`)}
                    </span>
                  );
                })}
              </div>
            )}
    </section>
  );
}
