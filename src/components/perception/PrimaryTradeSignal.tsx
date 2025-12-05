"use client";

import { ArrowDownRight, ArrowRightCircle, ArrowUpRight, LucideIcon } from "lucide-react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

type PrimaryTradeSignalProps = {
  setup: Pick<
    Setup,
    | "direction"
    | "rings"
    | "confidence"
    | "timeframe"
    | "symbol"
    | "assetId"
  > &
    Partial<
      Pick<Setup, "eventScore" | "biasScore" | "sentimentScore" | "riskReward">
    > & { riskReward?: Setup["riskReward"] | null };
};

type SignalKey = "strongLong" | "strongShort" | "cautious" | "noEdge";
type ExtendedSignal = SignalKey | "coreLong" | "coreShort";

const ICONS: Record<ExtendedSignal, LucideIcon> = {
  strongLong: ArrowUpRight,
  strongShort: ArrowDownRight,
  coreLong: ArrowUpRight,
  coreShort: ArrowDownRight,
  cautious: ArrowRightCircle,
  noEdge: ArrowRightCircle,
};

const COLOR_CLASSES: Record<ExtendedSignal, string> = {
  strongLong: "text-emerald-300 bg-emerald-500/10 border-emerald-500/50",
  strongShort: "text-rose-300 bg-rose-500/10 border-rose-500/50",
  coreLong: "text-emerald-200 bg-emerald-500/10 border-emerald-500/30",
  coreShort: "text-rose-200 bg-rose-500/10 border-rose-500/30",
  cautious: "text-amber-300 bg-amber-500/10 border-amber-500/40",
  noEdge: "text-slate-300 bg-slate-700/20 border-slate-600/60",
};

function confidenceBucket(score: number): "low" | "medium" | "high" {
  if (score > 70) return "high";
  if (score >= 46) return "medium";
  return "low";
}

function bucket(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function bucketRrr(rrr?: number | null): "weak" | "ok" | "strong" | null {
  if (rrr === undefined || rrr === null || Number.isNaN(rrr)) return null;
  if (rrr < 2) return "weak";
  if (rrr < 3) return "ok";
  return "strong";
}

function bucketRisk(risk?: number | null): "low" | "medium" | "high" | null {
  if (risk === undefined || risk === null || Number.isNaN(risk)) return null;
  if (risk <= 1.2) return "low";
  if (risk <= 2.5) return "medium";
  return "high";
}

export function PrimaryTradeSignal({ setup }: PrimaryTradeSignalProps): JSX.Element {
  const t = useT();
  const rings = setup.rings ?? {
    trendScore: 0,
    biasScore: setup.biasScore ?? 0,
    orderflowScore: 0,
    eventScore: setup.eventScore ?? 0,
    sentimentScore: setup.sentimentScore ?? 0,
  };

  const trend = rings.trendScore ?? 0;
  const bias = rings.biasScore ?? 0;
  const flow = rings.orderflowScore ?? 0;
  const event = rings.eventScore ?? setup.eventScore ?? 0;
  const confidence = confidenceBucket(rings.confidenceScore ?? setup.confidence ?? 0);
  const rrr = setup.riskReward?.rrr ?? null;
  const riskPct = setup.riskReward?.riskPercent ?? null;
  const sentiment = rings.sentimentScore ?? 0;

  const trendBucket = bucket(trend);
  const biasBucket = bucket(bias);
  const flowBucket = bucket(flow);
  const eventBucket = event >= 75 ? "high" : event >= 40 ? "medium" : "low";
  const sentimentBucket = bucket(sentiment);
  const rrrBucket = bucketRrr(rrr);
  const riskBucket = bucketRisk(riskPct);

  const highDriver =
    (trendBucket === "high" || biasBucket === "high") && (flowBucket === "high" || sentimentBucket === "high");
  const hasAnyDriver =
    trendBucket === "high" || biasBucket === "high" || flowBucket === "high" || sentimentBucket === "high";
  const weakFlow = flowBucket === "low";
  const eventRiskHigh = event >= 75;
  const conflictDerived =
    (weakFlow && (trendBucket === "high" || biasBucket === "high" || sentimentBucket === "high")) ||
    (eventRiskHigh && (trendBucket === "high" || biasBucket === "high")) ||
    (hasAnyDriver && confidence === "low");

  const allMedium =
    trendBucket === "medium" &&
    biasBucket === "medium" &&
    flowBucket === "medium" &&
    sentimentBucket === "medium" &&
    eventBucket === "medium";

  const noEdge =
    (allMedium && (rrr === null || rrr < 2)) ||
    (!hasAnyDriver && eventBucket === "high") ||
    (confidence === "low" && (rrrBucket === "weak" || rrr === null));

  let signal: ExtendedSignal = "noEdge";
  const canHighConviction =
    highDriver &&
    confidence === "high" &&
    rrrBucket === "strong" &&
    (riskBucket === null || riskBucket === "low") &&
    (eventBucket === "low" || eventBucket === "medium") &&
    !noEdge &&
    !conflictDerived &&
    !eventRiskHigh;
  const canCore =
    !noEdge &&
    [trendBucket, biasBucket, flowBucket, sentimentBucket].filter((b) => b === "high").length >= 2 &&
    (rrrBucket === "ok" || rrrBucket === "strong") &&
    (riskBucket === null || riskBucket !== "high") &&
    confidence !== "low" &&
    eventBucket !== "high" &&
    !conflictDerived;

  if (noEdge || rrrBucket === "weak" || conflictDerived) {
    signal = "noEdge";
  } else if (canHighConviction) {
    signal = setup.direction === "Long" ? "strongLong" : "strongShort";
  } else if (canCore) {
    signal = setup.direction === "Long" ? "coreLong" : "coreShort";
  } else if (
    hasAnyDriver &&
    (eventRiskHigh || weakFlow || confidence === "low" || riskBucket === "high" || conflictDerived)
  ) {
    signal = "cautious";
  } else if (conflictDerived) {
    signal = "cautious";
  }

  const Icon = ICONS[signal];
  const color = COLOR_CLASSES[signal];

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${color}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-current bg-black/20">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
            {t("perception.tradeDecision.signal.title")}
          </p>
          <p className="text-base font-semibold text-white">
            {t(`perception.tradeDecision.signal.${signal}.label`)}
          </p>
          <p className="text-xs text-slate-200/80">
            {(() => {
              const template = t(`perception.tradeDecision.signal.${signal}.teaser`);
              return template
                .replace("{timeframe}", setup.timeframe ?? "")
                .replace("{asset}", setup.symbol ?? setup.assetId ?? "");
            })()}
          </p>
        </div>
      </div>
    </div>
  );
}
