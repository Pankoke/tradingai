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

type OrderflowReasonDetailEntry = NonNullable<NonNullable<Setup["orderflow"]>["reasonDetails"]>[number];

const isReasonDetail = (value: unknown): value is OrderflowReasonDetailEntry => {
  return typeof value === "object" && value !== null && "text" in value && "category" in value;
};

const resolveProfileLabelKey = (profile?: string | null): string => {
  if (profile === "crypto") return "perception.orderflow.profile.crypto";
  return "perception.orderflow.profile.default";
};

const resolveTrendAlignmentKey = (
  trendScore: number | null | undefined,
  mode?: string | null,
): string => {
  if (typeof trendScore !== "number" || !mode) {
    return "perception.orderflow.context.neutral";
  }
  if (trendScore >= 60) {
    if (mode === "buyers") return "perception.orderflow.context.aligned";
    if (mode === "sellers") return "perception.orderflow.context.conflict";
  }
  if (trendScore <= 40) {
    if (mode === "sellers") return "perception.orderflow.context.aligned";
    if (mode === "buyers") return "perception.orderflow.context.conflict";
  }
  return "perception.orderflow.context.neutral";
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
  if (!orderflow) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[OrderflowInspector] Missing orderflow data for setup", setup.id);
    }
    return null;
  }

  const hasScore = typeof orderflow.score === "number";
  const tier = hasScore ? getScoreTier(orderflow.score) : "neutral";
  const modeKey = orderflow.mode ?? setup.orderflowMode ?? "balanced";
  const modeLabel = modeLabelMap[modeKey] ?? modeLabelMap.balanced;

  const reasonSource = orderflow.reasonDetails ?? orderflow.reasons ?? [];
  const displayedReasons = reasonSource.slice(0, variant === "full" ? 3 : 1);
  const hasReasons = displayedReasons.length > 0;
  const flags = orderflow.flags ?? [];
  const hasFlags = flags.length > 0;
  const delta = orderflow.confidenceDelta;
  const isNoData =
    typeof orderflow.score === "number" &&
    Math.abs(orderflow.score - 50) < 1 &&
    (orderflow.reasonDetails?.length ?? 0) === 1 &&
    orderflow.reasonDetails?.[0]?.category === "structure";

  const resolveCategoryLabel = (category?: string): string => {
    if (!category) {
      return t("perception.orderflow.category.other");
    }
    const key = `perception.orderflow.category.${category}`;
    const translated = t(key);
    if (translated === key) {
      return t("perception.orderflow.category.other");
    }
    return translated;
  };

  if (!hasScore && !hasReasons && !hasFlags) {
    return null;
  }

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
          <span className={`text-3xl font-bold ${hasScore ? "text-white" : "text-slate-500"}`}>
            {hasScore ? Math.round(orderflow.score as number) : "--"}
          </span>
          <span className={`text-xs font-semibold uppercase tracking-[0.3em] ${hasScore ? "text-slate-400" : "text-slate-600"}`}>
            /100
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full border border-slate-800 bg-slate-950/40 px-2 py-0.5 text-xs font-semibold text-slate-300">
          {t(modeLabel)}
        </span>
        {typeof delta === "number" && Math.abs(delta) >= 0.1 && (
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${delta >= 0 ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" : "border-rose-500/60 bg-rose-500/10 text-rose-300"}`}
          >
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} {t("perception.orderflow.confidenceDelta")}
          </span>
        )}
      </div>

      {orderflow.meta && (
        <div className="space-y-1 text-xs text-slate-500">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <span>{t(resolveProfileLabelKey(orderflow.meta.profile))}</span>
            {orderflow.meta.timeframeSamples && (
              <span>
                {t("perception.orderflow.metaLabel")}:{" "}
                {Object.entries(orderflow.meta.timeframeSamples)
                  .filter(([, value]) => (value ?? 0) > 0)
                  .map(([tf, value]) => `${tf}: ${value}`)
                  .join(" · ") || "n/a"}
              </span>
            )}
          </div>
          {orderflow.meta.context && (
            <span>
              {t(
                resolveTrendAlignmentKey(
                  orderflow.meta.context.trendScore ?? null,
                  orderflow.mode ?? setup.orderflowMode ?? null,
                ),
              )}
            </span>
          )}
        </div>
      )}

      {isNoData && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t("perception.orderflow.noData.headline")}
          </p>
          <p className="text-sm text-slate-300">
            {t("perception.orderflow.noData.body")}
          </p>
        </div>
      )}

      {variant === "full" && hasReasons && (
        <div className="space-y-1">
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-500">{t("perception.orderflow.reasonsTitle")}</p>
          <div className="space-y-1">
            {displayedReasons.map((reason, idx) => {
              const detail = isReasonDetail(reason) ? reason : null;
              const categoryLabel = detail ? resolveCategoryLabel(detail.category) : t("perception.orderflow.reasonsTitle");
              const textValue = detail ? detail.text : String(reason ?? "");
              const key = detail ? `${detail.category}-${idx}` : `${String(reason ?? "reason")}-${idx}`;
              return (
                <div key={key} className="flex items-center justify-between gap-2 text-xs text-slate-200">
                  <span className="text-slate-400">{categoryLabel}</span>
                  <span>{textValue}</span>
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    {t("perception.orderflow.reasonLabel.default")}
                  </span>
                </div>
              );
            })}
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
