"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

type PositioningGuideProps = {
  setup: Pick<Setup, "rings" | "confidence"> &
    Partial<Pick<Setup, "riskReward" | "eventScore" | "ringAiSummary">> & {
      riskReward?: Setup["riskReward"] | null;
    };
};

type Tone = "good" | "ok" | "weak" | "risk";

function badgeTone(tone: Tone): string {
  switch (tone) {
    case "good":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    case "ok":
      return "bg-amber-500/15 text-amber-200 border-amber-500/30";
    case "risk":
      return "bg-rose-500/15 text-rose-200 border-rose-500/30";
    case "weak":
    default:
      return "bg-slate-600/20 text-slate-200 border-slate-500/50";
  }
}

function bucket(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function confidenceBucket(score: number): "low" | "medium" | "high" {
  if (score > 70) return "high";
  if (score >= 46) return "medium";
  return "low";
}

function hasFact(keyFacts: Array<{ label: string; value: string }>, label: string): boolean {
  return keyFacts.some((f) => f.label.toLowerCase().includes(label.toLowerCase()));
}

export function PositioningGuide({ setup }: PositioningGuideProps): JSX.Element {
  const t = useT();
  const rings = setup.rings ?? {
    eventScore: setup.eventScore ?? 0,
    orderflowScore: 0,
    confidenceScore: setup.confidence ?? 0,
    biasScore: 0,
    trendScore: 0,
  };

  const event = rings.eventScore ?? 0;
  const flow = rings.orderflowScore ?? 0;
  const confidence = rings.confidenceScore ?? setup.confidence ?? 0;
  const rrr = setup.riskReward?.rrr ?? null;
  const riskPct = setup.riskReward?.riskPercent ?? null;
  const keyFacts = setup.ringAiSummary?.keyFacts ?? [];

  const eventBucket = event >= 75 ? "high" : event >= 40 ? "medium" : "low";
  const flowBucket = bucket(flow);
  const confBucket = confidenceBucket(confidence);
  const rrrBucket = (() => {
    if (rrr === null || Number.isNaN(rrr)) return null;
    if (rrr < 2) return "weak";
    if (rrr < 3) return "ok";
    return "strong";
  })();
  const riskPctBucket = (() => {
    if (riskPct === null || Number.isNaN(riskPct)) return null;
    if (riskPct <= 1.2) return "low";
    if (riskPct <= 2.5) return "medium";
    return "high";
  })();

  const hasConflict = hasFact(keyFacts, "conflict");
  const hasRiskFact = hasFact(keyFacts, "risk");
  const hasEdgeFact = hasFact(keyFacts, "edge");

  // Sizing heuristic
  let sizing: "small" | "medium" | "aggressive" = "medium";
  if (
    eventBucket === "high" ||
    rrrBucket === "weak" ||
    riskPctBucket === "high" ||
    confBucket === "low" ||
    hasConflict ||
    hasRiskFact ||
    hasEdgeFact
  ) {
    sizing = "small";
  } else if (
    rrrBucket === "strong" &&
    (riskPctBucket === null || riskPctBucket === "low") &&
    (eventBucket === "low" || eventBucket === "medium") &&
    confBucket === "high" &&
    !hasConflict
  ) {
    sizing = "aggressive";
  } else {
    sizing = "medium";
  }

  // Timing heuristic
  let timingKey: "event" | "flow" | "trend" | "neutral" = "neutral";
  let timingTone: Tone = "ok";
  if (eventBucket === "high") {
    timingKey = "event";
    timingTone = "risk";
  } else if (flowBucket === "high" && (eventBucket === "low" || eventBucket === "medium")) {
    timingKey = "flow";
    timingTone = "good";
  } else if (
    (bucket(rings.trendScore) === "high" || bucket(rings.biasScore) === "high") &&
    (eventBucket === "low" || eventBucket === "medium") &&
    !hasConflict
  ) {
    timingKey = "trend";
    timingTone = "good";
  } else {
    timingKey = "neutral";
    timingTone = "ok";
  }
  const timingText = t(`perception.tradeDecision.positioning.timing.${timingKey}`);

  // RRR fitness
  const rrrTone: Tone =
    rrrBucket === "strong" ? "good" : rrrBucket === "ok" ? "ok" : "weak";
  const rrrText = t(`perception.tradeDecision.positioning.rrr.${rrrBucket ?? "weak"}`);

  // Confidence badge text
  let confidenceTone: Tone = confBucket === "high" ? "good" : confBucket === "medium" ? "ok" : "weak";
  let confidenceText = t(`perception.tradeDecision.positioning.sizing.${sizing}`).replace(
    "{confidence}",
    `${Math.round(confidence)}%`,
  );
  if (sizing === "aggressive") {
    confidenceTone = "good";
  }
  if (sizing === "small") {
    confidenceTone = "weak";
  }

  const rows = [
    {
      label: t("perception.tradeDecision.positioning.timing"),
      tone: timingTone,
      value: timingText,
    },
    {
      label: t("perception.tradeDecision.positioning.rrr"),
      tone: rrrTone,
      value: rrrText,
    },
    {
      label: t("perception.tradeDecision.positioning.sizingLabel"),
      tone: confidenceTone,
      value: confidenceText,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {t("perception.tradeDecision.positioning.title")}
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 py-2"
          >
            <span className="text-xs text-slate-200">{row.label}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone(row.tone)}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sizing priority: Event/RRR/Risk% and conflicts gate aggressiveness; confidence adjusts tone; flow/trend set timing bias.
