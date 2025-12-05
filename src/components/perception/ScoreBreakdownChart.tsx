"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

type Props = {
  setup: Setup;
};

type Bucket = "low" | "medium" | "high";

const bucketClass: Record<Bucket, string> = {
  low: "bg-rose-500",
  medium: "bg-amber-400",
  high: "bg-emerald-400",
};

function toBucket(score?: number | null): Bucket {
  if (score === undefined || score === null) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function ScoreBreakdownChart({ setup }: Props): JSX.Element {
  const t = useT();
  const rings =
    setup.rings ??
    ({
      trendScore: "trendScore" in setup ? (setup as Setup & { trendScore?: number }).trendScore ?? 0 : 0,
      eventScore: "eventScore" in setup ? (setup as Setup & { eventScore?: number }).eventScore ?? 0 : 0,
      biasScore: "biasScore" in setup ? (setup as Setup & { biasScore?: number }).biasScore ?? 0 : 0,
      sentimentScore:
        "sentimentScore" in setup ? (setup as Setup & { sentimentScore?: number }).sentimentScore ?? 0 : 0,
      orderflowScore:
        "orderflowScore" in setup ? (setup as Setup & { orderflowScore?: number }).orderflowScore ?? 0 : 0,
      confidenceScore: setup.confidence ?? 0,
    } as Setup["rings"]);

  const items = [
    { key: "trend", label: t("perception.scoreBreakdown.labels.trend"), value: rings.trendScore ?? 0 },
    { key: "event", label: t("perception.scoreBreakdown.labels.event"), value: rings.eventScore ?? 0 },
    { key: "bias", label: t("perception.scoreBreakdown.labels.bias"), value: rings.biasScore ?? 0 },
    { key: "sentiment", label: t("perception.scoreBreakdown.labels.sentiment"), value: rings.sentimentScore ?? 0 },
    { key: "orderflow", label: t("perception.scoreBreakdown.labels.orderflow"), value: rings.orderflowScore ?? 0 },
    {
      key: "confidence",
      label: t("perception.scoreBreakdown.labels.confidence"),
      value: rings.confidenceScore ?? setup.confidence ?? 0,
    },
  ];

  return (
    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
          {t("perception.scoreBreakdown.title")}
        </p>
        <p className="text-[0.75rem] text-slate-500">{t("perception.scoreBreakdown.subtitle")}</p>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const bucket = toBucket(item.value);
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between text-xs text-slate-200">
                <span>{item.label}</span>
                <span className="text-slate-400">
                  {Math.round(item.value)} / {bucket}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800">
                <div
                  className={`h-2.5 rounded-full ${bucketClass[bucket]}`}
                  style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
