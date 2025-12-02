"use client";

import React from "react";
import type { JSX } from "react";
import { Badge } from "@/src/components/ui/badge";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { LevelDebugBlock } from "@/src/components/perception/LevelDebugBlock";
import { RiskRewardBlock } from "@/src/components/perception/RiskRewardBlock";
import { formatAssetLabel } from "@/src/lib/formatters/asset";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { BigGauge, SmallGauge } from "@/src/components/perception/RingGauges";

type Props = {
  setup: HomepageSetup;
  weakLabel: string;
  labels: {
    directionLong: string;
    directionShort: string;
    confidence: string;
    entry: string;
    take: string;
    stop: string;
    eventHigh: string;
    eventMedium: string;
    eventLow: string;
    sourceRuleBased: string;
    biasBullish: string;
    biasBearish: string;
    biasNeutral: string;
    sentimentPositive: string;
    sentimentNegative: string;
    sentimentNeutral: string;
    orderflowBuyers: string;
    orderflowSellers: string;
    orderflowBalanced: string;
  };
};

function formatOptionalDecimal(value?: number | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(4);
}

function formatEntryZoneRange(value: { from: number | null; to: number | null }): string {
  if (
    value.from === null ||
    value.to === null ||
    !Number.isFinite(value.from) ||
    !Number.isFinite(value.to)
  ) {
    return "n/a";
  }
  return `${value.from.toFixed(4)} - ${value.to.toFixed(4)}`;
}

export default function HomepageSetupCard({ setup, weakLabel, labels }: Props): JSX.Element {
  const t = useT();
  const assetHeadline = formatAssetLabel(setup.assetId, setup.symbol);
  const rings = setup.rings;
  const smallRingDefinitions = [
    {
      key: "trendScore" as const,
      label: t("perception.today.scoreTrend"),
      tone: "teal" as const,
      tooltip: t("perception.rings.tooltip.trend"),
    },
    {
      key: "eventScore" as const,
      label: t("perception.today.eventRing"),
      tone: "accent" as const,
      tooltip: t("perception.rings.tooltip.event"),
    },
    {
      key: "biasScore" as const,
      label: t("perception.today.biasRing"),
      tone: "green" as const,
      tooltip: t("perception.rings.tooltip.bias"),
    },
    {
      key: "sentimentScore" as const,
      label: t("perception.today.sentimentRing"),
      tone: "teal" as const,
      tooltip: t("perception.rings.tooltip.sentiment"),
    },
    {
      key: "orderflowScore" as const,
      label: t("perception.today.orderflowRing"),
      tone: "accent" as const,
      tooltip: t("perception.rings.tooltip.orderflow"),
    },
  ];
  const confidenceValue = rings.confidenceScore;

  const detailBoxClass = "rounded-2xl border border-slate-800 bg-[#0f172a]/80 px-4 py-3 shadow-[inset_0_0_25px_rgba(15,23,42,0.9)]";
  const baseCardClass = "flex h-full flex-col justify-between rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_rgba(4,7,15,0.98)] px-5 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] md:px-8 md:py-8";

  return (
    <div className={baseCardClass}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-slate-500">{labels.sourceRuleBased}</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {assetHeadline} · {setup.timeframe}
          </p>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
            <Badge
              className={`inline-flex items-center rounded-full border px-2 py-1 ${
                setup.direction === "Long"
                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
              }`}
            >
              {setup.direction === "Long" ? labels.directionLong : labels.directionShort}
            </Badge>
            {setup.weakSignal ? (
              <Badge className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                {weakLabel}
              </Badge>
            ) : null}
          </div>
        </div>
        <BigGauge
          value={confidenceValue}
          label={labels.confidence}
          tooltip={t("perception.rings.tooltip.confidence")}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[0.65rem] sm:grid-cols-4 md:grid-cols-6">
        {smallRingDefinitions.map((ring) => (
          <SmallGauge
            key={ring.label}
            label={ring.label}
            value={rings[ring.key]}
            tone={ring.tone}
            tooltip={ring.tooltip}
          />
        ))}
      </div>

  <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
        <div className={detailBoxClass}>
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">{labels.entry}</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {formatEntryZoneRange(setup.entryZone)}
          </div>
        </div>
        <div className={detailBoxClass}>
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">{labels.take}</div>
          <div className="mt-1 text-lg font-semibold text-emerald-400">
            {formatOptionalDecimal(setup.takeProfit)}
          </div>
        </div>
        <div className={detailBoxClass}>
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">{labels.stop}</div>
          <div className="mt-1 text-lg font-semibold text-rose-400">
            {formatOptionalDecimal(setup.stopLoss)}
          </div>
        </div>
      </div>

      <LevelDebugBlock
        category={setup.category ?? setup.levelDebug?.category}
        referencePrice={setup.levelDebug?.referencePrice ?? null}
        bandPct={setup.levelDebug?.bandPct ?? null}
        volatilityScore={setup.levelDebug?.volatilityScore ?? null}
        scoreVolatility={setup.levelDebug?.scoreVolatility ?? null}
        entryZone={formatEntryZoneRange(setup.entryZone)}
        stopLoss={formatOptionalDecimal(setup.stopLoss)}
        takeProfit={formatOptionalDecimal(setup.takeProfit)}
        rings={setup.rings}
        snapshotId={setup.snapshotId ?? null}
        snapshotCreatedAt={setup.snapshotCreatedAt ?? null}
      />
      <div className="mt-4">
        <RiskRewardBlock riskReward={setup.riskReward ?? null} />
      </div>
    </div>
  );
}
