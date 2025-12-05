"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { RingAiSummary, RiskRewardSummary, Setup } from "@/src/lib/engine/types";
import { formatEventTiming } from "@/src/components/perception/EventMicroTimingStrip";

type Props = {
  setup: Setup;
  ringAiSummary?: RingAiSummary | null;
  riskReward?: RiskRewardSummary | null;
  eventContext?: Setup["eventContext"] | null;
};

type Bucket = "low" | "medium" | "high";

function scoreBucket(score?: number | null): Bucket {
  if (score === undefined || score === null) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function eventBucket(score?: number | null): Bucket {
  if (score === undefined || score === null) return "low";
  if (score >= 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function rrrBucket(rrr?: number | null): "weak" | "ok" | "strong" {
  if (!rrr || Number.isNaN(rrr)) return "weak";
  if (rrr >= 3) return "strong";
  if (rrr >= 2) return "ok";
  return "weak";
}

function riskBucket(risk?: number | null): Bucket {
  if (risk === undefined || risk === null) return "medium";
  if (risk > 2.5) return "high";
  if (risk > 1.2) return "medium";
  return "low";
}

export function TraderNarrativeBlock({ setup, ringAiSummary, riskReward, eventContext }: Props): JSX.Element {
  const t = useT();

  const rings =
    setup.rings ??
    ({
      trendScore: "trendScore" in setup ? (setup as Setup & { trendScore?: number }).trendScore ?? 0 : 0,
      biasScore: "biasScore" in setup ? (setup as Setup & { biasScore?: number }).biasScore ?? 0 : 0,
      orderflowScore:
        "orderflowScore" in setup ? (setup as Setup & { orderflowScore?: number }).orderflowScore ?? 0 : 0,
      sentimentScore:
        "sentimentScore" in setup ? (setup as Setup & { sentimentScore?: number }).sentimentScore ?? 0 : 0,
      eventScore: "eventScore" in setup ? (setup as Setup & { eventScore?: number }).eventScore ?? 0 : 0,
      confidenceScore: setup.confidence ?? 0,
    } as Setup["rings"]);

  const driverLabels: string[] = [];
  if (scoreBucket(rings.trendScore) === "high") driverLabels.push("trend");
  if (scoreBucket(rings.biasScore) === "high") driverLabels.push("bias");
  if (scoreBucket(rings.orderflowScore) === "high") driverLabels.push("flow");
  if (scoreBucket(rings.sentimentScore) === "high") driverLabels.push("sentiment");

  const flowBucket = scoreBucket(rings.orderflowScore);
  const eventLevel = eventBucket(rings.eventScore);
  const confidenceLevel = scoreBucket(rings.confidenceScore);
  const rrrLevel = rrrBucket(riskReward?.rrr ?? null);
  const riskLevel = riskBucket(riskReward?.riskPercent ?? null);

  const hasConflict =
    ringAiSummary?.keyFacts?.some((f) => f.label?.toLowerCase().includes("conflict")) ?? false;

  const noEdge =
    rings.trendScore >= 40 &&
    rings.trendScore <= 60 &&
    rings.biasScore >= 40 &&
    rings.biasScore <= 60 &&
    rings.orderflowScore >= 40 &&
    rings.orderflowScore <= 60 &&
    rings.eventScore >= 40 &&
    rings.eventScore <= 60 &&
    rings.sentimentScore >= 40 &&
    rings.sentimentScore <= 60 &&
    rrrLevel === "weak";

  const marketSentence =
    driverLabels.length > 0
      ? t("perception.narrative.market")
          .replace("{direction}", setup.direction)
          .replace("{drivers}", driverLabels.join(" + "))
      : t("perception.narrative.marketNeutral").replace("{direction}", setup.direction);

  const flowSentence =
    flowBucket === "high"
      ? t("perception.narrative.flowHigh")
      : flowBucket === "medium"
        ? t("perception.narrative.flowMedium")
        : t("perception.narrative.flowLow");

  const topEvent = eventContext?.topEvents?.[0];
  let timingText: string | null = null;
  if (topEvent?.scheduledAt) {
    timingText = formatEventTiming(topEvent.scheduledAt, t);
  }

  const eventSentence =
    eventLevel === "high"
      ? t("perception.narrative.eventHigh")
      : eventLevel === "medium"
        ? t("perception.narrative.eventMedium")
        : t("perception.narrative.eventLow");

  const timingSentence =
    timingText && topEvent?.title
      ? t("perception.narrative.eventTiming")
          .replace("{title}", topEvent.title)
          .replace("{time}", timingText)
      : null;

  const rrrSentence =
    rrrLevel === "strong"
      ? t("perception.narrative.rrrStrong").replace("{rrr}", (riskReward?.rrr ?? 0).toFixed(2))
      : rrrLevel === "ok"
        ? t("perception.narrative.rrrOk").replace("{rrr}", (riskReward?.rrr ?? 0).toFixed(2))
        : t("perception.narrative.rrrWeak").replace("{rrr}", (riskReward?.rrr ?? 0).toFixed(2));

  const riskSentence =
    riskLevel === "high"
      ? t("perception.narrative.riskHigh").replace("{risk}", (riskReward?.riskPercent ?? 0).toFixed(2))
      : riskLevel === "medium"
        ? t("perception.narrative.riskMedium").replace("{risk}", (riskReward?.riskPercent ?? 0).toFixed(2))
        : t("perception.narrative.riskLow").replace("{risk}", (riskReward?.riskPercent ?? 0).toFixed(2));

  const confluenceSentence = noEdge
    ? t("perception.narrative.confluenceNone")
    : hasConflict
      ? t("perception.narrative.confluenceConflict")
      : driverLabels.length >= 2
        ? t("perception.narrative.confluenceStrong")
        : t("perception.narrative.confluenceMixed");

  const finalSentence = noEdge
    ? t("perception.narrative.finalWatch")
    : eventLevel === "high" || hasConflict || confidenceLevel === "low"
      ? t("perception.narrative.finalCautious")
      : t("perception.narrative.finalActionable");

  const sentences = [
    marketSentence,
    flowSentence,
    eventSentence,
    timingSentence,
    `${rrrSentence} ${riskSentence}`,
    confluenceSentence,
    finalSentence,
  ].filter(Boolean);

  return (
    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
      <p className="mb-1 text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
        {t("perception.narrative.title")}
      </p>
      <p className="text-sm leading-relaxed text-slate-100">{sentences.join(" ")}</p>
    </div>
  );
}
