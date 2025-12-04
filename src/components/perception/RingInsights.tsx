"use client";

import { useState, type JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { RingAiSummary, Setup } from "@/src/lib/engine/types";

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
  ringAiSummary?: RingAiSummary | null;
  eventContext?: Setup["eventContext"] | null;
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

function formatEventTiming(isoDate: string, translate: (key: string) => string): string {
  const target = new Date(isoDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Number.isFinite(diffMinutes) && Math.abs(diffMinutes) <= 24 * 60) {
    const hours = Math.max(0, Math.round(diffMinutes / 60));
    if (diffMinutes >= 0) {
      return translate("perception.rings.insights.event.inHours").replace("{hours}", hours.toString());
    }
    return translate("perception.rings.insights.event.hoursAgo").replace("{hours}", Math.abs(hours).toString());
  }

  return target.toLocaleString();
}

export function RingInsights({
  rings,
  assetLabel,
  timeframe,
  direction,
  aiSummary,
  ringAiSummary,
  eventContext,
}: RingInsightsProps): JSX.Element {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  const commonVars = {
    asset: assetLabel ?? t("perception.rings.insights.assetFallback"),
    timeframe: timeframe ?? t("perception.rings.insights.timeframeFallback"),
    direction: direction ?? t("perception.rings.insights.directionFallback"),
  };

  const topEvent = eventContext?.topEvents?.[0];

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
  const summaryData: RingAiSummary | null =
    ringAiSummary ?? (aiSummary ? { shortSummary: aiSummary, longSummary: aiSummary, keyFacts: [] } : null);

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner shadow-black/10">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.25em] text-slate-400">
            {t("perception.rings.insights.title")}
          </p>
          <p className="text-sm text-slate-300">{t("perception.rings.insights.subtitle")}</p>
        </div>
        <div>
          <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
            {summaryData?.source === "llm"
              ? t("perception.rings.insights.source.llm")
              : t("perception.rings.insights.source.heuristic")}
          </span>
        </div>
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
              {item.key === "event" && topEvent
                ? formatInsightText(t, "perception.rings.insights.event.context", {
                    ...commonVars,
                    score: Math.round(item.score).toString(),
                    title: topEvent.title ?? t("perception.rings.insights.event.noTitle"),
                    time: topEvent.scheduledAt
                      ? formatEventTiming(topEvent.scheduledAt, t)
                      : t("perception.rings.insights.event.noTime"),
                    severity: topEvent.severity ?? "n/a",
                  })
                : formatInsightText(t, `perception.rings.insights.${item.key}.${item.bucket}`, {
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
      {summaryData ? (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">
            {t("perception.rings.insights.aiSummaryTitle")}
          </p>
          <p className="mt-1 text-xs text-slate-100">{summaryData.shortSummary}</p>
          {summaryData.keyFacts.length ? (
            <ul className="mt-2 list-disc list-inside space-y-0.5 text-xs text-slate-200">
              {summaryData.keyFacts.map((fact, idx) => (
                <li key={`${fact.label}-${idx}`}>
                  <span className="font-semibold">{fact.label}:</span> {fact.value}
                </li>
              ))}
            </ul>
          ) : null}
          {summaryData.longSummary && summaryData.longSummary !== summaryData.shortSummary ? (
            <div className="mt-2 text-xs text-slate-200">
              {expanded ? <p>{summaryData.longSummary}</p> : null}
              <button
                type="button"
                className="mt-1 text-[11px] font-semibold text-sky-300 hover:text-sky-200"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? t("perception.rings.insights.showLess") : t("perception.rings.insights.showMore")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
