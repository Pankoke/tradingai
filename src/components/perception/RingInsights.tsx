"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";

type RingInsightsProps = {
  rings: {
    trendScore: number;
    eventScore: number;
    biasScore: number;
    sentimentScore: number;
    orderflowScore: number;
    confidenceScore?: number;
  };
  assetLabel?: string | null;
  timeframe?: string | null;
  direction?: "Long" | "Short" | "Neutral" | null;
  aiSummary?: string | null;
};

type Bucket = "low" | "medium" | "high";

function bucketFromScore(score: number): Bucket {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function formatInsightText(
  translate: (key: string) => string,
  key: string,
  vars: Record<string, string>,
): string {
  const template = translate(key);
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), template);
}

export function RingInsights({ rings, assetLabel, timeframe, direction, aiSummary }: RingInsightsProps): JSX.Element {
  const t = useT();

  const commonVars = {
    asset: assetLabel ?? t("perception.rings.insights.assetFallback"),
    timeframe: timeframe ?? t("perception.rings.insights.timeframeFallback"),
    direction: direction ?? t("perception.rings.insights.directionFallback"),
  };

  const items = [
    {
      key: "trend",
      score: rings.trendScore,
      bucket: bucketFromScore(rings.trendScore),
    },
    {
      key: "event",
      score: rings.eventScore,
      bucket: bucketFromScore(rings.eventScore),
    },
    {
      key: "bias",
      score: rings.biasScore,
      bucket: bucketFromScore(rings.biasScore),
    },
    {
      key: "sentiment",
      score: rings.sentimentScore,
      bucket: bucketFromScore(rings.sentimentScore),
    },
    {
      key: "orderflow",
      score: rings.orderflowScore,
      bucket: bucketFromScore(rings.orderflowScore),
    },
  ] as const;

  const confidence = rings.confidenceScore;

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner shadow-black/10">
      <div className="mb-2">
        <p className="text-[0.6rem] uppercase tracking-[0.25em] text-slate-400">
          {t("perception.rings.insights.title")}
        </p>
        <p className="text-sm text-slate-300">{t("perception.rings.insights.subtitle")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t(`perception.rings.title.${item.key}`)}</span>
              <span className="font-semibold text-slate-200">{Math.round(item.score)}%</span>
            </div>
            <p className="mt-1 text-xs text-slate-200">
              {formatInsightText(t, `perception.rings.insights.${item.key}.${item.bucket}`, {
                ...commonVars,
                score: Math.round(item.score).toString(),
              })}
            </p>
          </div>
        ))}
        {confidence !== undefined ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t("perception.today.confidenceRing")}</span>
              <span className="font-semibold text-slate-200">{Math.round(confidence)}%</span>
            </div>
            <p className="mt-1 text-xs text-slate-200">
              {formatInsightText(t, `perception.rings.insights.confidence.${bucketFromScore(confidence)}`, {
                ...commonVars,
                score: Math.round(confidence).toString(),
              })}
            </p>
          </div>
        ) : null}
      </div>
      {aiSummary ? (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">
            {t("perception.rings.insights.aiSummaryTitle")}
          </p>
          <p className="mt-1 text-xs text-slate-100">{aiSummary}</p>
        </div>
      ) : null}
    </div>
  );
}
