"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

type TraderPlaybookProps = {
  setup: Pick<Setup, "rings" | "confidence"> &
    Partial<Pick<Setup, "riskReward" | "sentimentScore" | "eventScore" | "biasScore" | "ringAiSummary">>;
};

type Bucket = "low" | "medium" | "high";

function bucket(score: number): Bucket {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function pickFactByLabel(
  keyFacts: Array<{ label: string; value: string }>,
  target: string,
): string | null {
  const found = keyFacts.find((f) => f.label.toLowerCase().includes(target.toLowerCase()));
  return found ? found.value : null;
}

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
  const riskPct = setup.riskReward?.riskPercent ?? null;
  const keyFacts = setup.ringAiSummary?.keyFacts ?? [];

  const bullets: string[] = [];

  if (keyFacts.length >= 1) {
    const driver = pickFactByLabel(keyFacts, "driver");
    const risk = pickFactByLabel(keyFacts, "risk");
    const conflict = pickFactByLabel(keyFacts, "conflict");
    const confidenceFact = pickFactByLabel(keyFacts, "confidence");
    const edge = pickFactByLabel(keyFacts, "edge");

    if (driver) bullets.push(t("perception.tradeDecision.playbook.driver").replace("{driver}", driver));
    if (risk) bullets.push(t("perception.tradeDecision.playbook.risk").replace("{risk}", risk));
    if (conflict) bullets.push(t("perception.tradeDecision.playbook.conflict").replace("{conflict}", conflict));
    if (edge) {
      bullets.push(t("perception.tradeDecision.playbook.edge").replace("{edge}", edge));
    } else if (confidenceFact) {
      bullets.push(
        t("perception.tradeDecision.playbook.confidenceMgmt").replace("{confidence}", confidenceFact),
      );
    }
  }

  if (bullets.length < 2) {
    if (event >= 65) bullets.push(t("perception.tradeDecision.playbook.highEvent"));
    if (rrr !== null && rrr < 2) bullets.push(t("perception.tradeDecision.playbook.lowRRR"));
    if (confidence < 50) bullets.push(t("perception.tradeDecision.playbook.lowConfidence"));
    if (flow <= 40) bullets.push(t("perception.tradeDecision.playbook.weakFlow"));
    if (trend >= 70 && bias >= 70) bullets.push(t("perception.tradeDecision.playbook.trendBiasHigh"));
    else if (flow >= 70 || sentiment >= 70) bullets.push(t("perception.tradeDecision.playbook.momentumPlay"));
    if (riskPct !== null && riskPct > 2.5) {
      bullets.push(
        t("perception.tradeDecision.playbook.riskPctHigh")
          .replace("{risk}", (riskPct ?? 0).toFixed(2))
          .replace("{rrr}", rrr !== null ? rrr.toFixed(2) : "n/a"),
      );
    }
    if (bullets.length === 0) {
      bullets.push(t("perception.tradeDecision.playbook.default"));
    }
  }

  // If no edge (all buckets medium and weak RRR), keep it lean
  const trendB = bucket(trend);
  const biasB = bucket(bias);
  const flowB = bucket(flow);
  const eventB = bucket(event);
  const sentimentB = bucket(sentiment);
  const allMedium =
    trendB === "medium" && biasB === "medium" && flowB === "medium" && eventB === "medium" && sentimentB === "medium";
  if (allMedium && (rrr === null || rrr < 2)) {
    bullets.splice(2);
  }

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {t("perception.tradeDecision.playbook.title")}
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-100">
        {bullets.slice(0, 4).map((b, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Bullet priority: Driver > Risk > Conflict > Confidence/Management; fallbacks use ring scores if keyFacts are missing.
