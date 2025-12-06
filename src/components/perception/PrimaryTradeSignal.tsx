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
export type TradeSignalResult = ExtendedSignal;
export type TradeSignalInput = PrimaryTradeSignalProps["setup"];

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

export function classifyTradeSignal(setup: TradeSignalInput): ExtendedSignal {
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

  const driversHighCount = [trend, bias, flow, sentiment].filter((value) => value >= 70).length;
  const anyDriverHigh = driversHighCount > 0;
  const hasDriverSupport =
    trendBucket === "high" || biasBucket === "high" || flowBucket === "high" || sentimentBucket === "high";
  const weakFlow = flowBucket === "low";
  const eventRiskHigh = event >= 75;
  const volatilityHigh = setup.riskReward?.volatilityLabel === "high";

  const conflictHigh =
    (weakFlow && (trend >= 70 || bias >= 70)) ||
    (eventRiskHigh && (trend >= 70 || bias >= 70)) ||
    (confidence === "low" && (trend >= 70 || bias >= 70));
  const conflictModerate =
    !conflictHigh &&
    ((weakFlow && hasDriverSupport) ||
      (eventRiskHigh && (trend >= 40 || bias >= 40)) ||
      (confidence === "medium" && (trend >= 70 || bias >= 70)));

  const strengthCriteria = [
    rrrBucket === "strong",
    riskBucket === null || riskBucket === "low",
    confidence !== "low",
    bias >= 40,
    trend >= 40,
    event < 75,
  ].filter(Boolean).length;

  const weaknessFlags = [
    rrrBucket === "weak" || rrr === null,
    riskBucket === "high",
    confidence === "low",
    bias < 40,
    trend < 40,
    sentiment < 40,
    flowBucket === "low",
    conflictHigh,
    eventRiskHigh && (rrrBucket === "weak" || confidence === "low"),
  ];
  const weaknessCount = weaknessFlags.filter(Boolean).length;

  const warningFlags = [
    eventRiskHigh,
    riskBucket === "high",
    volatilityHigh,
    conflictHigh || conflictModerate,
    trend < 40 && bias > 60,
    confidence === "low" && (bias >= 60 || trend >= 60),
  ];
  const warningCount = warningFlags.filter(Boolean).length;

  const canHighConviction =
    rrrBucket === "strong" &&
    (riskBucket === null || riskBucket === "low") &&
    confidence === "high" &&
    bias >= 70 &&
    event < 75 &&
    !conflictHigh &&
    driversHighCount >= 1;

  const canCore =
    !conflictHigh &&
    !conflictModerate &&
    strengthCriteria >= 3 &&
    hasDriverSupport &&
    (rrrBucket === "ok" || rrrBucket === "strong");

  let signal: ExtendedSignal = "noEdge";
  if (canHighConviction) {
    signal = setup.direction === "Long" ? "strongLong" : "strongShort";
  } else if (weaknessCount >= 2) {
    signal = "noEdge";
  } else if (canCore) {
    signal = setup.direction === "Long" ? "coreLong" : "coreShort";
  } else if (warningCount >= 2 || eventRiskHigh || conflictModerate || conflictHigh) {
    signal = "cautious";
  } else if (anyDriverHigh || rrrBucket === "ok" || rrrBucket === "strong") {
    signal = setup.direction === "Long" ? "coreLong" : "coreShort";
  } else {
    signal = "noEdge";
  }

  return signal;
}

export function PrimaryTradeSignal({ setup }: PrimaryTradeSignalProps): JSX.Element {
  const t = useT();
  const signal = classifyTradeSignal(setup);

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
