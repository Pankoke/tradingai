"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { RingAiSummary, RiskRewardSummary, Setup } from "@/src/lib/engine/types";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";

type Props = {
  setup: Setup;
  ringAiSummary?: RingAiSummary | null;
  riskReward?: RiskRewardSummary | null;
  eventContext?: Setup["eventContext"] | null;
};

type Bucket = "low" | "medium" | "high";
type RrrBucket = "weak" | "ok" | "strong";

const ratingPalette: Record<string, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-lime-400 text-slate-900",
  C: "bg-yellow-400 text-slate-900",
  D: "bg-orange-400 text-slate-900",
};

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

function rrrBucket(rrr?: number | null): RrrBucket {
  if (!rrr || Number.isNaN(rrr)) return "weak";
  if (rrr >= 3) return "strong";
  if (rrr >= 2) return "ok";
  return "weak";
}

function riskPctBucket(risk?: number | null): Bucket {
  if (risk === undefined || risk === null) return "medium";
  if (risk > 2.5) return "high";
  if (risk > 1.2) return "medium";
  return "low";
}

export function SetupRatingBlock({ setup, ringAiSummary, riskReward }: Props): JSX.Element {
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

  const drivers: string[] = [];
  if (scoreBucket(rings.trendScore) === "high") drivers.push("trend");
  if (scoreBucket(rings.biasScore) === "high") drivers.push("bias");
  if (scoreBucket(rings.orderflowScore) === "high") drivers.push("flow");
  if (scoreBucket(rings.sentimentScore) === "high") drivers.push("sentiment");
  if (eventBucket(rings.eventScore) === "high" && !drivers.includes("event")) {
    drivers.push("event");
  }

  const conflicts =
    ringAiSummary?.keyFacts?.filter((f) => f.label?.toLowerCase().includes("conflict")) ?? [];

  const flowWeakVsDrivers =
    scoreBucket(rings.orderflowScore) === "low" && (drivers.includes("trend") || drivers.includes("bias"));
  const eventHigh = eventBucket(rings.eventScore) === "high";
  const confidenceLow = scoreBucket(rings.confidenceScore) === "low";
  const rrr = rrrBucket(riskReward?.rrr);
  const riskPct = riskPctBucket(riskReward?.riskPercent);

  const hasConflict =
    conflicts.length > 0 || flowWeakVsDrivers || (eventHigh && (drivers.includes("bias") || drivers.includes("trend")));

  const signalQuality = useMemo(() => computeSignalQuality(setup), [setup]);
  const rating = (signalQuality.grade ?? "D") as "A" | "B" | "C" | "D";
  const ratingLabel = t(signalQuality.labelKey);
  const confidenceLevel = scoreBucket(rings.confidenceScore);
  const eventLevel = eventBucket(rings.eventScore);

  const metaLine = t("perception.setupRating.metaLine")
    .replace("{quality}", ratingLabel)
    .replace("{confidence}", t(`perception.setupRating.confidence.${confidenceLevel}`))
    .replace("{event}", t(`perception.setupRating.event.${eventLevel}`));

  const reasons: string[] = [];
  if (drivers.length > 0) {
    reasons.push(t("perception.setupRating.reason.drivers").replace("{items}", drivers.join(", ")));
  }
  const riskItems: string[] = [];
  if (eventHigh) riskItems.push(t("perception.setupRating.event.high"));
  if (rrr === "weak") riskItems.push(t("perception.setupRating.risk.rrrWeak"));
  if (riskPct === "high") riskItems.push(t("perception.setupRating.risk.highCapital"));
  if (confidenceLow) riskItems.push(t("perception.setupRating.confidence.low"));
  if (scoreBucket(rings.orderflowScore) === "low") riskItems.push(t("perception.setupRating.risk.flowWeak"));
  if (riskItems.length > 0) {
    reasons.push(
      t("perception.setupRating.reason.risks").replace("{items}", riskItems.slice(0, 3).join(", ")),
    );
  }
  if (hasConflict && reasons.length < 2) {
    reasons.push(
      t("perception.setupRating.reason.conflicts").replace(
        "{items}",
        conflicts[0]?.value ?? t("perception.setupRating.conflict.default"),
      ),
    );
  }
  if (reasons.length === 0) {
    reasons.push(metaLine);
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${ratingPalette[rating]}`}
        >
          {rating}
        </span>
        <div className="flex flex-col">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-400">
            {t("perception.setupRating.title")}
          </p>
          <p className="text-sm font-semibold text-slate-100">{metaLine}</p>
        </div>
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-200">
        {reasons.slice(0, 2).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}
