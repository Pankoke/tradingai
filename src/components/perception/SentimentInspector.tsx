"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { cn } from "@/lib/utils";
import type { SentimentFlag, Setup } from "@/src/lib/engine/types";

type SentimentInspectorProps = {
  sentiment?: Setup["sentiment"] | null;
  className?: string;
  variant?: "default" | "compact";
  meta?: {
    setupId?: string | null;
    assetId?: string | null;
    symbol?: string | null;
  };
};

type ReasonCategory =
  | "bias"
  | "trend"
  | "momentum"
  | "event"
  | "rrr"
  | "flow"
  | "volatility"
  | "risk"
  | "general";

const CATEGORY_MATCHERS: Record<ReasonCategory, RegExp[]> = {
  bias: [/bias/i],
  trend: [/trend/i],
  momentum: [/momentum/i],
  event: [/event/i, /calendar/i],
  rrr: [/rrr/i, /reward/i],
  flow: [/orderflow/i, /flow/i],
  volatility: [/volatility/i],
  risk: [/risk per trade/i, /risk/i],
  general: [],
};

const CATEGORY_STYLES: Record<ReasonCategory, string> = {
  bias: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
  trend: "border-sky-500/50 bg-sky-500/10 text-sky-200",
  momentum: "border-violet-500/50 bg-violet-500/10 text-violet-200",
  event: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  rrr: "border-cyan-500/50 bg-cyan-500/10 text-cyan-200",
  flow: "border-pink-500/50 bg-pink-500/10 text-pink-200",
  volatility: "border-indigo-500/50 bg-indigo-500/10 text-indigo-200",
  risk: "border-rose-500/50 bg-rose-500/10 text-rose-200",
  general: "border-slate-500/40 bg-slate-500/10 text-slate-200",
};

const FLAG_STYLES: Record<SentimentFlag, string> = {
  supports_trend: "border-emerald-500/60 bg-emerald-500/10 text-emerald-200",
  supports_bias: "border-lime-500/60 bg-lime-500/10 text-lime-200",
  contrarian_to_trend: "border-amber-500/60 bg-amber-500/10 text-amber-200",
  contrarian_to_bias: "border-amber-500/60 bg-amber-500/10 text-amber-200",
  event_capped: "border-pink-500/60 bg-pink-500/10 text-pink-200",
  rrr_mismatch: "border-cyan-500/60 bg-cyan-500/10 text-cyan-200",
  high_risk_crowded: "border-rose-500/60 bg-rose-500/10 text-rose-200",
  low_conviction: "border-slate-500/50 bg-slate-500/10 text-slate-200",
};

function inferCategory(reason: string): ReasonCategory {
  const target = reason.toLowerCase();
  for (const entry of Object.entries(CATEGORY_MATCHERS)) {
    const [category, patterns] = entry as [ReasonCategory, RegExp[]];
    if (patterns.some((pattern) => pattern.test(target))) {
      return category;
    }
  }
  return "general";
}

export function SentimentInspector({
  sentiment,
  className,
  variant = "default",
  meta,
}: SentimentInspectorProps): JSX.Element | null {
  const t = useT();
  const hasSentiment =
    sentiment && typeof sentiment.score === "number" && Number.isFinite(sentiment.score);

  const reasons = useMemo(() => {
    const trimmed = (sentiment?.reasons ?? []).filter(Boolean);
    return trimmed.slice(0, variant === "compact" ? 2 : 3);
  }, [sentiment?.reasons, variant]);

  const flags = useMemo(() => (sentiment?.flags ?? []).filter(Boolean) as SentimentFlag[], [sentiment?.flags]);
  const displayedFlags = useMemo(() => flags.slice(0, variant === "compact" ? 2 : 5), [flags, variant]);
  const driverSummaries = useMemo(
    () => (sentiment?.dominantDrivers ?? []).filter(Boolean).slice(0, variant === "compact" ? 2 : 3),
    [sentiment?.dominantDrivers, variant],
  );

  const hasDrivers = driverSummaries.length > 0;

  if (!hasSentiment || (reasons.length === 0 && displayedFlags.length === 0 && !hasDrivers)) {
    if (process.env.NODE_ENV !== "production" && meta?.setupId) {
      console.warn(
        "[SentimentInspector] Missing sentiment data",
        {
          setupId: meta.setupId,
          assetId: meta.assetId,
          symbol: meta.symbol,
          hasSentiment,
          reasonCount: reasons.length,
        },
      );
    }
    return null;
  }

  const labelKey = `perception.sentiment.labels.${sentiment!.label ?? "neutral"}`;
  const isCompact = variant === "compact";

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-[inset_0_0_15px_rgba(0,0,0,0.25)]",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
            {t("perception.sentiment.inspector.title")}
          </p>
          <p className="text-sm font-semibold text-slate-100">
            {t(labelKey)}
          </p>
        </div>
        <div className={cn("font-bold text-white", isCompact ? "text-2xl" : "text-3xl")}> 
          {Math.round(sentiment!.score)}
          <span className="ml-1 text-xs text-slate-400">/100</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
          {t("perception.sentiment.inspector.reasonsTitle")}
        </p>
        <ul className="space-y-2">
          {reasons.map((reason, index) => {
            const category = inferCategory(reason);
            const badgeLabel = t(
              `perception.sentiment.reasonCategory.${category}`,
            );
            return (
              <li key={`${reason}-${index}`} className="space-y-1">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold",
                    CATEGORY_STYLES[category],
                  )}
                >
                  {badgeLabel}
                </span>
                <p className={cn("text-xs text-slate-100", isCompact && "text-[0.7rem]")}>{reason}</p>
              </li>
            );
          })}
        </ul>
      </div>

      {hasDrivers && (
        <div className="mt-4 space-y-2">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
            {t("perception.sentiment.inspector.driversTitle")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {driverSummaries.map((driver, index) => {
              const label = t(`perception.sentiment.driverCategory.${driver.category}`);
              const contribution = driver.contribution;
              const toneClass =
                contribution >= 0
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-200";
              const formattedContribution = `${contribution >= 0 ? "+" : ""}${Math.round(contribution)}`;
              return (
                <div
                  key={`${driver.category}-${index}`}
                  className="rounded-lg border border-slate-700/70 bg-slate-800/40 px-3 py-2 text-xs text-slate-100"
                >
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formattedContribution}
                    <span className="ml-1 text-xs text-slate-400">pts</span>
                  </p>
                  <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.6rem] font-semibold", toneClass)}>
                    {contribution >= 0 ? t("perception.sentiment.driverPositive") : t("perception.sentiment.driverNegative")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {displayedFlags.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
            {t("perception.sentiment.inspector.flagsTitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            {displayedFlags.map((flag) => (
              <span
                key={flag}
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold",
                  FLAG_STYLES[flag] ?? "border-slate-600 bg-slate-600/10 text-slate-200",
                )}
              >
                {t(`perception.sentiment.flags.${flag}`)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}




