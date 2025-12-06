"use client";

import { useState, type JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { cn } from "@/lib/utils";
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
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function confidenceBucketScore(score: number): Bucket {
  if (score > 70) return "high";
  if (score >= 46) return "medium";
  return "low";
}

function eventBucketFromScore(score: number): Bucket {
  if (score >= 75) return "high";
  if (score >= 40) return "medium";
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

function buildConfluenceLine(
  t: (k: string) => string,
  rings: RingInsightsProps["rings"],
  riskRewardRrr?: number | null,
) {
  const entries = [
    { key: "trend", score: rings.trendScore },
    { key: "bias", score: rings.biasScore },
    { key: "orderflow", score: rings.orderflowScore },
    { key: "sentiment", score: rings.sentimentScore },
    { key: "event", score: rings.eventScore },
  ];

  const drivers = entries.filter((e) => bucketFromScore(e.score) === "high").sort((a, b) => b.score - a.score);
  const weakness = entries.reduce((min, cur) => (cur.score < min.score ? cur : min), entries[0]);

  const confidenceVal = rings.confidenceScore ?? 0;
  const confidenceBucket = confidenceBucketScore(confidenceVal);
  const conflict =
    (bucketFromScore(rings.orderflowScore) === "low" &&
      (bucketFromScore(rings.trendScore) === "high" || bucketFromScore(rings.biasScore) === "high")) ||
    (eventBucketFromScore(rings.eventScore) === "high" &&
      (bucketFromScore(rings.trendScore) === "high" || bucketFromScore(rings.biasScore) === "high")) ||
    (bucketFromScore(rings.trendScore) === "high" && confidenceBucket === "low") ||
    (bucketFromScore(rings.biasScore) === "high" && confidenceBucket === "low");

  let level: "strong" | "mixed" | "noEdge" = "mixed";
  if (drivers.length >= 2 && weakness.score >= 34 && !conflict) level = "strong";
  else if (drivers.length === 0 && weakness.score >= 34 && (riskRewardRrr ?? 0) < 2) level = "noEdge";
  else if (drivers.length === 0 && weakness.score < 34) level = "noEdge";

  const driverText =
    drivers.slice(0, 2).map((d) => `${t(`perception.rings.title.${d.key}`)} ${Math.round(d.score)}`).join(", ") ||
    t("perception.rings.confluence.none");
  const weaknessText = `${t(`perception.rings.title.${weakness.key}`)} ${Math.round(weakness.score)}`;
  const rrrText = riskRewardRrr != null ? riskRewardRrr.toFixed(2) : t("perception.rings.confluence.rrrNA");

  const template = t(`perception.rings.confluence.${level}`);
  const line = template
    .replace("{drivers}", driverText)
    .replace("{weakness}", weaknessText)
    .replace("{confidence}", Math.round(confidenceVal).toString())
    .replace("{confBucket}", confidenceBucket)
    .replace("{rrr}", rrrText);
  return conflict
    ? `${line} (${t("perception.tradeDecision.playbook.conflict").replace("{conflict}", t("perception.tradeDecision.playbook.weakFlow"))})`
    : line;
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
      bucket: eventBucketFromScore(rings.eventScore),
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

  const confluenceLine = buildConfluenceLine(t, rings, undefined);

  const cardBadge = (bucket: Bucket): string =>
    cn(
      "inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold border",
      bucket === "high" && "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
      bucket === "medium" && "border-amber-500/60 bg-amber-500/10 text-amber-300",
      bucket === "low" && "border-rose-500/60 bg-rose-500/10 text-rose-300",
    );

  const heatBar = (bucket: Bucket): string =>
    cn(
      "h-full rounded-full transition-all",
      bucket === "high" && "bg-emerald-400",
      bucket === "medium" && "bg-amber-400",
      bucket === "low" && "bg-rose-400",
    );

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 lg:p-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
          {t("perception.rings.insights.title")}
        </h3>
        <p className="text-xs text-slate-400">
          {t("perception.rings.confluence.title")}: {confluenceLine}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const label = t(`perception.rings.title.${item.key}`);
          const score = Math.round(item.score);
          const description =
            item.key === "event" && topEvent
              ? formatInsightText(t, "perception.rings.insights.event.context", {
                  ...commonVars,
                  score: score.toString(),
                  title: topEvent.title ?? t("perception.rings.insights.event.noTitle"),
                  time: topEvent.scheduledAt
                    ? formatEventTiming(topEvent.scheduledAt, t)
                    : t("perception.rings.insights.event.noTime"),
                  severity: topEvent.severity ?? "n/a",
                })
              : formatInsightText(t, `perception.rings.insights.${item.key}.${item.bucket}`, {
                  ...commonVars,
                  score: score.toString(),
                });

          return (
            <div key={item.key} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">{score}%</span>
                  <span className={cardBadge(item.bucket)}>{t(`perception.rings.bucket.${item.bucket}`)}</span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className={heatBar(item.bucket)} style={{ width: `${score}%` }} />
              </div>
              <p className="text-xs text-slate-300/90">{description}</p>
            </div>
          );
        })}
        {confidence !== undefined ? (
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 shadow-inner">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t("perception.today.confidenceRing")}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">{Math.round(confidence)}%</span>
                <span className={cardBadge(bucketFromScore(confidence))}>
                  {t(`perception.rings.bucket.${bucketFromScore(confidence)}`)}
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div className={heatBar(bucketFromScore(confidence))} style={{ width: `${Math.round(confidence)}%` }} />
            </div>
            <p className="text-xs text-slate-300/90">
              {formatInsightText(t, `perception.rings.insights.confidence.${bucketFromScore(confidence)}`, {
                ...commonVars,
                score: Math.round(confidence).toString(),
              })}
            </p>
          </div>
        ) : null}
      </div>

      {summaryData ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-slate-300/90">
              {t("perception.rings.insights.aiSummaryTitle")}
            </span>
            <span className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
              {summaryData?.source === "llm"
                ? t("perception.rings.insights.source.llm")
                : t("perception.rings.insights.source.heuristic")}
            </span>
          </div>
          <p className="mt-2 text-slate-100">{summaryData.shortSummary}</p>
          {summaryData.keyFacts.length ? (
            <ul className="mt-2 list-disc list-inside space-y-0.5 text-slate-200">
              {summaryData.keyFacts.map((fact, idx) => (
                <li key={`${fact.label}-${idx}`}>
                  <span className="font-semibold">{fact.label}:</span> {fact.value}
                </li>
              ))}
            </ul>
          ) : null}
          {summaryData.longSummary && summaryData.longSummary !== summaryData.shortSummary ? (
            <div className="mt-2 text-slate-200">
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
    </section>
  );
}
