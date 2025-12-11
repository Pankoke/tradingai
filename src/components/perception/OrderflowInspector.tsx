"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { RingInspectorLayout } from "@/src/components/perception/RingInspectorLayout";
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
    return (
      <RingInspectorLayout
        title={t("perception.orderflow.title")}
        variant={variant}
        emptyState={t("perception.orderflow.empty")}
      />
    );
  }

  const hasScore = typeof orderflow.score === "number";
  const tier = hasScore ? getScoreTier(orderflow.score as number) : "neutral";
  const modeKey = orderflow.mode ?? setup.orderflowMode ?? "balanced";
  const modeLabel = modeLabelMap[modeKey] ?? modeLabelMap.balanced;

  const reasonSource = orderflow.reasonDetails ?? orderflow.reasons ?? [];
  const displayedReasons = reasonSource.slice(0, variant === "full" ? 3 : 1);
  const flags = orderflow.flags ?? [];
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

  if (!hasScore && displayedReasons.length === 0 && flags.length === 0) {
    return (
      <RingInspectorLayout
        title={t("perception.orderflow.title")}
        variant={variant}
        emptyState={t("perception.orderflow.empty")}
      />
    );
  }

  const summary = t("perception.orderflow.summary")
    .replace("{score}", t(scoreLabel[tier]))
    .replace("{mode}", t(modeLabel));
  const scoreTone = tier === "strong" ? "high" : tier === "supportive" ? "medium" : "low";

  const infoBadges = (
    <div className="flex flex-wrap gap-2 text-xs text-slate-200">
      <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2 py-0.5 font-semibold">
        {t(modeLabel)}
      </span>
      {typeof delta === "number" && Math.abs(delta) >= 0.1 && (
        <span
          className={`rounded-full border px-2 py-0.5 font-semibold ${
            delta >= 0
              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/60 bg-rose-500/10 text-rose-200"
          }`}
        >
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)} {t("perception.orderflow.confidenceDelta")}
        </span>
      )}
    </div>
  );

  const metaSection = orderflow.meta && (
    <div className="space-y-1 text-xs text-slate-400">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <span>{t(resolveProfileLabelKey(orderflow.meta.profile))}</span>
        {orderflow.meta.timeframeSamples && (
          <span>
            {t("perception.orderflow.metaLabel")}: {" "}
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
  );

  const reasonsSection =
    displayedReasons.length > 0 && (
      <div className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
          {t("perception.orderflow.reasonsTitle")}
        </p>
        <div className="space-y-2">
          {displayedReasons.map((reason, idx) => {
            const detail = isReasonDetail(reason) ? reason : null;
            const categoryLabel = detail
              ? resolveCategoryLabel(detail.category)
              : t("perception.orderflow.category.other");
            const textValue = detail ? detail.text : String(reason ?? "");
            const key = detail
              ? `${detail.category}-${idx}`
              : `${String(reason ?? "reason")}-${idx}`;
            return (
              <div
                key={key}
                className="rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs text-slate-200"
              >
                <p className="text-[0.6rem] uppercase tracking-[0.25em] text-slate-400">
                  {categoryLabel}
                </p>
                <p className="mt-1 text-sm text-slate-100">{textValue}</p>
              </div>
            );
          })}
        </div>
      </div>
    );

  const flagsSection =
    flags.length > 0 && (
      <div className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
          {t("perception.orderflow.flagsTitle")}
        </p>
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
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                    : isConflict
                      ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
                      : isHighRisk
                        ? "border-rose-500/60 bg-rose-500/10 text-rose-200"
                        : "border-slate-700 bg-slate-800 text-slate-200"
                }`}
              >
                {t(flagLabelMap[flag] ?? `perception.orderflow.flags.${flag}`)}
              </span>
            );
          })}
        </div>
      </div>
    );

  const noDataSection = isNoData && (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {t("perception.orderflow.noData.headline")}
      </p>
      <p className="text-sm text-slate-300">
        {t("perception.orderflow.noData.body")}
      </p>
    </div>
  );

  return (
    <RingInspectorLayout
      title={t("perception.orderflow.title")}
      scoreLabel={hasScore ? `${Math.round(orderflow.score as number)} / 100` : undefined}
      scoreTone={scoreTone}
      summary={summary}
      variant={variant}
      emptyState={t("perception.orderflow.empty")}
    >
      <div className="space-y-4">
        {infoBadges}
        {metaSection}
        {noDataSection}
        {reasonsSection}
        {variant === "full" && flagsSection}
      </div>
    </RingInspectorLayout>
  );
}
