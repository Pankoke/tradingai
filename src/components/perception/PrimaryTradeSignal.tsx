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
    >;
};

type SignalKey = "strongLong" | "strongShort" | "cautious" | "noEdge";

const ICONS: Record<SignalKey, LucideIcon> = {
  strongLong: ArrowUpRight,
  strongShort: ArrowDownRight,
  cautious: ArrowRightCircle,
  noEdge: ArrowRightCircle,
};

const COLOR_CLASSES: Record<SignalKey, string> = {
  strongLong: "text-emerald-300 bg-emerald-500/10 border-emerald-500/50",
  strongShort: "text-rose-300 bg-rose-500/10 border-rose-500/50",
  cautious: "text-amber-300 bg-amber-500/10 border-amber-500/40",
  noEdge: "text-slate-300 bg-slate-700/20 border-slate-600/60",
};

function confidenceBucket(score: number): "low" | "medium" | "high" {
  if (score > 70) return "high";
  if (score >= 46) return "medium";
  return "low";
}

function bucket(score: number): "low" | "medium" | "high" {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
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
  const sentiment = rings.sentimentScore ?? 0;

  const trendBucket = bucket(trend);
  const biasBucket = bucket(bias);
  const flowBucket = bucket(flow);
  const eventBucket = bucket(event);
  const sentimentBucket = bucket(sentiment);

  const strongDriver =
    (trendBucket === "high" && biasBucket === "high") || (trendBucket === "high" && flowBucket !== "low");
  const weakFlow = flow <= 40;
  const eventRisk = event >= 65;
  const lowRRR = rrr !== null ? rrr < 1.8 : false;

  const allMedium =
    trendBucket === "medium" &&
    biasBucket === "medium" &&
    flowBucket === "medium" &&
    sentimentBucket === "medium" &&
    eventBucket === "medium";

  const noEdge =
    (allMedium && (rrr === null || rrr < 2)) ||
    ((trendBucket !== "high" && biasBucket !== "high") && eventBucket === "high") ||
    (confidence === "low" && !(rrr !== null && rrr > 2));

  const hasAnyDriver = trendBucket === "high" || biasBucket === "high" || flowBucket === "high" || sentimentBucket === "high";
  const watchRisk = confidence === "low" || lowRRR || eventBucket === "high";

  let signal: SignalKey = "noEdge";
  if (
    strongDriver &&
    confidence !== "low" &&
    (rrr === null || rrr >= 2) &&
    eventBucket !== "high"
  ) {
    if (setup.direction === "Long") signal = "strongLong";
    else if (setup.direction === "Short") signal = "strongShort";
  } else if (noEdge) {
    signal = "noEdge";
  } else if (hasAnyDriver && (watchRisk || weakFlow)) {
    signal = "cautious";
  } else if (weakFlow || eventRisk || lowRRR || confidence === "low") {
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
