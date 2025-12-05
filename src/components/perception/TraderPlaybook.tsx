"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

type TraderPlaybookProps = {
  setup: Pick<
    Setup,
    | "rings"
    | "confidence"
  > &
    Partial<Pick<Setup, "sentimentScore" | "eventScore" | "biasScore" | "riskReward">>;
};

export function TraderPlaybook({ setup }: TraderPlaybookProps): JSX.Element {
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
  const rrr = setup.riskReward?.rrr ?? null;
  const confidence = rings.confidenceScore ?? setup.confidence ?? 0;
  const sentiment = rings.sentimentScore ?? 0;

  const bullets: string[] = [];

  if (event >= 65) bullets.push(t("perception.tradeDecision.playbook.highEvent"));
  if (confidence < 50) bullets.push(t("perception.tradeDecision.playbook.lowConfidence"));
  if (rrr !== null && rrr < 2) bullets.push(t("perception.tradeDecision.playbook.lowRRR"));
  if (flow <= 40) bullets.push(t("perception.tradeDecision.playbook.weakFlow"));
  if (trend >= 70 && bias >= 70) bullets.push(t("perception.tradeDecision.playbook.trendBiasHigh"));
  else if (flow >= 70 || sentiment >= 70) bullets.push(t("perception.tradeDecision.playbook.momentumPlay"));

  if (bullets.length === 0) {
    bullets.push(t("perception.tradeDecision.playbook.default"));
  }

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {t("perception.tradeDecision.playbook.title")}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-100">
        {bullets.slice(0, 5).map((b, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
