"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

type PositioningGuideProps = {
  setup: Pick<
    Setup,
    | "rings"
    | "confidence"
  > &
    Partial<Pick<Setup, "riskReward" | "eventScore">>;
};

function badgeTone(tone: "good" | "ok" | "weak" | "risk"): string {
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

export function PositioningGuide({ setup }: PositioningGuideProps): JSX.Element {
  const t = useT();
  const rings = setup.rings ?? {
    eventScore: setup.eventScore ?? 0,
    orderflowScore: 0,
    confidenceScore: setup.confidence ?? 0,
  };

  const event = rings.eventScore ?? 0;
  const flow = rings.orderflowScore ?? 0;
  const confidence = rings.confidenceScore ?? setup.confidence ?? 0;
  const rrr = setup.riskReward?.rrr ?? null;

  const timingTone: "good" | "ok" | "risk" =
    event >= 65 || confidence < 46 || (rrr !== null && rrr < 2)
      ? "risk"
      : flow >= 70 && event <= 50
        ? "good"
        : "ok";

  const rrrTone: "good" | "ok" | "weak" =
    rrr !== null
      ? rrr >= 3
        ? "good"
        : rrr >= 2
          ? "ok"
          : "weak"
      : "weak";

  const confidenceTone: "good" | "ok" | "weak" =
    confidence > 70 ? "good" : confidence >= 46 ? "ok" : "weak";

  const rows = [
    {
      label: t("perception.tradeDecision.positioning.timing"),
      tone: timingTone,
      value: t(`perception.tradeDecision.positioning.timing.${timingTone}`),
    },
    {
      label: t("perception.tradeDecision.positioning.rrr"),
      tone: rrrTone,
      value: t(`perception.tradeDecision.positioning.rrr.${rrrTone}`),
    },
    {
      label: t("perception.tradeDecision.positioning.confidence"),
      tone: confidenceTone,
      value: `${t(`perception.tradeDecision.positioning.confidence.${confidenceTone}`)} (${Math.round(confidence)}%)`,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {t("perception.tradeDecision.positioning.title")}
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 py-2">
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
