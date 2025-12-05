"use client";

import { Activity, CalendarClock, Globe2, Layers } from "lucide-react";
import type { JSX } from "react";
import type { Setup, RingAiSummary } from "@/src/lib/engine/types";
import { useT } from "@/src/lib/i18n/ClientProvider";

type TraderContextOverlayProps = {
  setup: Pick<
    Setup,
    | "rings"
    | "confidence"
    | "eventContext"
    | "riskReward"
    | "ringAiSummary"
    | "timeframe"
    | "symbol"
    | "assetId"
  > & { riskReward?: Setup["riskReward"] | null; ringAiSummary?: RingAiSummary | null };
};

type Bucket = "low" | "medium" | "high";

const bucketFromScore = (score: number): Bucket => {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
};

const bucketConfidence = (score: number): Bucket => {
  if (score > 70) return "high";
  if (score >= 46) return "medium";
  return "low";
};

const bucketRrr = (rrr?: number | null): "weak" | "ok" | "strong" | null => {
  if (rrr === undefined || rrr === null || Number.isNaN(rrr)) return null;
  if (rrr < 2) return "weak";
  if (rrr < 3) return "ok";
  return "strong";
};

const bucketRisk = (risk?: number | null): "low" | "medium" | "high" | null => {
  if (risk === undefined || risk === null || Number.isNaN(risk)) return null;
  if (risk <= 1.2) return "low";
  if (risk <= 2.5) return "medium";
  return "high";
};

function formatEventTiming(iso: string, t: (k: string) => string): string {
  const target = new Date(iso);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (Number.isFinite(diffMinutes) && Math.abs(diffMinutes) <= 24 * 60) {
    const hours = Math.max(0, Math.round(diffMinutes / 60));
    if (diffMinutes >= 0) return t("perception.context.eventIn").replace("{hours}", hours.toString());
    return t("perception.context.eventAgo").replace("{hours}", Math.abs(hours).toString());
  }
  return t("perception.context.eventAt").replace("{time}", target.toLocaleString());
}

export function TraderContextOverlay({ setup }: TraderContextOverlayProps): JSX.Element {
  const t = useT();
  const rings = setup.rings ?? {
    trendScore: 0,
    biasScore: 0,
    orderflowScore: 0,
    eventScore: 0,
    sentimentScore: 0,
    confidenceScore: setup.confidence ?? 0,
  };

  const confidenceBucket = bucketConfidence(rings.confidenceScore ?? setup.confidence ?? 0);
  const eventBucket = rings.eventScore >= 75 ? "high" : rings.eventScore >= 40 ? "medium" : "low";
  const rrrBucket = bucketRrr(setup.riskReward?.rrr ?? null);
  const riskBucket = bucketRisk(setup.riskReward?.riskPercent ?? null);

  const drivers = setup.ringAiSummary?.keyFacts?.find((f) => f.label.toLowerCase().includes("driver"))?.value;
  const conflict = setup.ringAiSummary?.keyFacts?.find((f) => f.label.toLowerCase().includes("conflict"))?.value;
  const riskFact = setup.ringAiSummary?.keyFacts?.find((f) => f.label.toLowerCase().includes("risk"))?.value;

  const topEvent = setup.eventContext?.topEvents?.[0];
  const eventTiming = topEvent?.scheduledAt ? formatEventTiming(topEvent.scheduledAt, t) : null;

  const rows = [
    {
      icon: Globe2,
      label: t("perception.context.market"),
      text: drivers
        ? drivers
        : `${t("perception.tradeDecision.signal.title")}: ${t(
            confidenceBucket === "high"
              ? "perception.rings.insights.confidence.high"
              : confidenceBucket === "medium"
                ? "perception.rings.insights.confidence.medium"
                : "perception.rings.insights.confidence.low",
          ).replace("{score}", Math.round(rings.confidenceScore ?? 0).toString())}`,
    },
    {
      icon: CalendarClock,
      label: t("perception.context.event"),
      text:
        topEvent && eventTiming
          ? `${topEvent.title ?? ""} (${eventTiming})`
          : t(
              eventBucket === "high"
                ? "perception.tradeDecision.playbook.highEvent"
                : eventBucket === "medium"
                  ? "perception.tradeDecision.playbook.mediumEvent"
                  : "perception.context.noEvent",
            ),
    },
    {
      icon: Layers,
      label: t("perception.context.structure"),
      text: conflict
        ? conflict
        : `${t("perception.tradeDecision.positioning.rrr")}: ${
            rrrBucket ? t(`perception.riskReward.tooltip.rrr.${rrrBucket}`).replace("{rrr}", "") : t("perception.riskReward.valueNA")
          }`,
    },
    {
      icon: Activity,
      label: t("perception.context.volatility"),
      text: riskFact
        ? riskFact
        : `${t("perception.riskReward.riskLabel")}: ${
            riskBucket ? t(`perception.riskReward.riskNote.${riskBucket}`).replace("{risk}", "") : t("perception.riskReward.valueNA")
          }`,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner shadow-black/10">
      <div className="grid gap-2 text-sm text-slate-200">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-2">
            <row.icon className="mt-0.5 h-4 w-4 text-slate-400" />
            <div className="flex-1">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">{row.label}</p>
              <p className="text-xs text-slate-200 line-clamp-2">{row.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
