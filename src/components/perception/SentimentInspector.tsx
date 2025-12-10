"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { cn } from "@/lib/utils";
import type { Setup } from "@/src/lib/engine/types";

type SentimentInspectorProps = {
  sentiment?: Setup["sentiment"] | null;
  className?: string;
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
}: SentimentInspectorProps): JSX.Element | null {
  const t = useT();
  const hasSentiment =
    sentiment && typeof sentiment.score === "number" && Number.isFinite(sentiment.score);

  const reasons = useMemo(
    () => (sentiment?.reasons ?? []).slice(0, 3),
    [sentiment?.reasons],
  );

  if (!hasSentiment) {
    return null;
  }

  const labelKey = `perception.sentiment.labels.${sentiment!.label ?? "neutral"}`;

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
        <div className="text-3xl font-bold text-white">
          {Math.round(sentiment!.score)}
          <span className="ml-1 text-xs text-slate-400">/100</span>
        </div>
      </div>

      {reasons.length > 0 ? (
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
                  <p className="text-xs text-slate-100">{reason}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="pt-2 text-xs text-slate-400">
          {t("perception.sentiment.inspector.noReasons")}
        </p>
      )}
    </section>
  );
}
