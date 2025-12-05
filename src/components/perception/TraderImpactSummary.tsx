"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { RingAiSummary, RiskRewardSummary, Setup } from "@/src/lib/engine/types";
import { formatEventTiming } from "@/src/components/perception/EventMicroTimingStrip";

type Props = {
  setup: Setup;
  ringAiSummary?: RingAiSummary | null;
  riskReward?: RiskRewardSummary | null;
  eventContext?: Setup["eventContext"] | null;
};

type Bucket = "low" | "medium" | "high";

const bucketScore = (score: number): Bucket => {
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

export function TraderImpactSummary({
  setup,
  ringAiSummary,
  riskReward,
  eventContext,
}: Props): JSX.Element {
  const t = useT();
  const rings = setup.rings ?? {
    trendScore: 0,
    biasScore: 0,
    orderflowScore: 0,
    eventScore: 0,
    sentimentScore: 0,
    confidenceScore: setup.confidence ?? 0,
  };

  // Drivers
  const driverFact = ringAiSummary?.keyFacts?.find((f) => f.label.toLowerCase().includes("driver"))?.value;
  const highDrivers = [
    { key: "trend", score: rings.trendScore },
    { key: "bias", score: rings.biasScore },
    { key: "flow", score: rings.orderflowScore },
    { key: "sentiment", score: rings.sentimentScore },
  ]
    .filter((d) => bucketScore(d.score) === "high")
    .map((d) => d.key);
  const driversText = driverFact
    ? driverFact
    : highDrivers.length
      ? `${highDrivers.join(" + ")}`
      : t("perception.rings.confluence.none");

  // Risks
  const riskFact = ringAiSummary?.keyFacts?.find((f) => f.label.toLowerCase().includes("risk"))?.value;
  const eventBucket: Bucket = rings.eventScore >= 75 ? "high" : rings.eventScore >= 40 ? "medium" : "low";
  const riskBucket = bucketRisk(riskReward?.riskPercent ?? null);
  const risks: string[] = [];
  if (riskFact) risks.push(riskFact);
  if (eventBucket === "high") risks.push(t("perception.tradeDecision.playbook.highEvent"));
  else if (eventBucket === "medium") risks.push(t("perception.tradeDecision.playbook.mediumEvent"));
  if (riskBucket === "high") risks.push(t("perception.tradeDecision.playbook.riskPctHigh").replace("{risk}", "").replace("{rrr}", ""));
  if (!risks.length) risks.push(t("perception.rings.confluence.mixed").split(":")[0]);

  // Confluence
  const driversCount = highDrivers.length;
  const confidenceBucket = bucketConfidence(rings.confidenceScore ?? setup.confidence ?? 0);
  const conflict = ringAiSummary?.keyFacts?.some((f) => f.label.toLowerCase().includes("conflict")) ?? false;
  const allMedium =
    bucketScore(rings.trendScore) === "medium" &&
    bucketScore(rings.biasScore) === "medium" &&
    bucketScore(rings.orderflowScore) === "medium" &&
    bucketScore(rings.sentimentScore) === "medium" &&
    eventBucket === "medium";
  const confluenceKey = conflict
    ? "perception.rings.confluence.mixed"
    : driversCount >= 2 && !allMedium
      ? "perception.rings.confluence.strong"
      : allMedium
        ? "perception.rings.confluence.noEdge"
        : "perception.rings.confluence.mixed";

  // RRR / Risk
  const rrrBucket = bucketRrr(riskReward?.rrr ?? null);
  const riskText =
    riskBucket != null
      ? t(`perception.riskReward.riskNote.${riskBucket}`).replace("{risk}", riskReward?.riskPercent?.toString() ?? "")
      : t("perception.riskReward.valueNA");
  const rrrText =
    rrrBucket != null
      ? t(`perception.riskReward.tooltip.rrr.${rrrBucket}`).replace("{rrr}", riskReward?.rrr?.toString() ?? "")
      : t("perception.riskReward.valueNA");

  // Timing
  const topEvent = eventContext?.topEvents?.[0];
  const timingText = topEvent?.scheduledAt
    ? formatEventTiming(topEvent.scheduledAt, t)
    : t("perception.context.noEvent");

  const sentimentTag =
    bucketScore(rings.sentimentScore) === "high" || bucketScore(rings.orderflowScore) === "high"
      ? `${t("perception.today.sentimentRing")}: ${Math.round(rings.sentimentScore)}`
      : null;

  const rows = [
    { label: t("perception.impactSummary.drivers"), value: driversText },
    { label: t("perception.impactSummary.risks"), value: risks.join(" · ") },
    { label: t("perception.impactSummary.confluence"), value: t(confluenceKey) },
    {
      label: t("perception.impactSummary.rrr"),
      value: `${riskReward?.rrr ?? "n/a"} (${rrrBucket ?? "n/a"})`,
    },
    { label: t("perception.impactSummary.riskPct"), value: riskText },
    { label: t("perception.impactSummary.timing"), value: timingText },
  ]
    .filter((r) => r.value)
    .slice(0, 6);

  if (sentimentTag && rows.length < 6) {
    rows.push({ label: t("perception.today.sentimentRing"), value: sentimentTag });
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner shadow-black/10">
      <p className="text-[0.65rem] uppercase tracking-[0.25em] text-slate-400">
        {t("perception.impactSummary.title")}
      </p>
      <div className="mt-2 grid gap-1 text-xs text-slate-200">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-2">
            <span className="text-slate-400">{row.label}:</span>
            <span className="text-slate-200">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
