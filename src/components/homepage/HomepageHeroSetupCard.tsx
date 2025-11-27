"use client";

import React from "react";
import type { JSX } from "react";
import { usePathname } from "next/navigation";
import { Badge } from "@/src/components/ui/badge";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { clamp } from "@/src/lib/math";

type Props = {
  setup: HomepageSetup;
  title: string;
  weakLabel: string;
  ctaLabel: string;
  labels: {
    directionLong: string;
    directionShort: string;
    assetTypeRuleBased: string;
    assetTypeAi: string;
    confidence: string;
    entry: string;
    stop: string;
    take: string;
    eventHigh: string;
    eventMedium: string;
    eventLow: string;
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

type RingStatProps = {
  valueLabel: string;
  percent: number;
  color: string;
};

function RingStat({ valueLabel, percent, color }: RingStatProps): JSX.Element {
  const clamped = clamp(percent, 0, 100);

  return (
    <div className="flex flex-col items-center gap-3" title={valueLabel}>
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-950"
        style={{
          backgroundImage: `conic-gradient(${color} ${clamped}%, rgba(15,23,42,0.7) ${clamped}%)`,
        }}
      >
        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-[0_0_0_1px_rgba(148,163,184,0.45)]">
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {clamped}%
          </span>
        </div>
      </div>
      <p className="text-[13px] text-[var(--text-secondary)] text-center">
        {valueLabel}
      </p>
    </div>
  );
}

function ConfidenceRing({
  value,
  label,
}: {
  value: number;
  label: string;
}): JSX.Element {
  const clamped = clamp(value, 0, 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-300">
        {label}
      </span>
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full bg-slate-950"
        style={{
          backgroundImage: `conic-gradient(#22c55e ${clamped}%, rgba(15,23,42,0.7) ${clamped}%)`,
        }}
        title={`${clamped}% ${label}`}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-main)] shadow-[0_0_0_2px_rgba(15,23,42,0.9)]">
          <span className="text-xl font-semibold text-slate-50">
            {clamped.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HomepageHeroSetupCard({
  setup,
  title,
  weakLabel,
  ctaLabel,
  labels,
}: Props): JSX.Element {
  const pathname = usePathname();
  const localePrefix = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const maybeLocale = segments[0];
    if (i18nConfig.locales.includes(maybeLocale as Locale)) {
      return `/${maybeLocale}`;
    }
    return `/${i18nConfig.defaultLocale}`;
  }, [pathname]);

  const confidence = clamp(setup.confidence, 0, 100);

  const eventLabel =
    setup.eventLevel === "high"
      ? labels.eventHigh
      : setup.eventLevel === "medium"
        ? labels.eventMedium
        : labels.eventLow;
  const eventPercent =
    setup.eventLevel === "high" ? 85 : setup.eventLevel === "medium" ? 60 : 35;

  const biasLabel =
    setup.bias.direction === "Bullish"
      ? labels.biasBullish
      : setup.bias.direction === "Bearish"
        ? labels.biasBearish
        : labels.biasNeutral;
  const biasPercent = clamp(setup.bias.strength, 0, 100);

  const sentimentLabel =
    setup.sentimentScore > 0.2
      ? labels.sentimentPositive
      : setup.sentimentScore < -0.2
        ? labels.sentimentNegative
        : labels.sentimentNeutral;
  const sentimentPercent = clamp(
    Math.round(((setup.sentimentScore + 1) / 2) * 100),
    0,
    100,
  );

  const orderflowLabel =
    setup.orderflowMode === "buyers_dominant"
      ? labels.orderflowBuyers
      : setup.orderflowMode === "sellers_dominant"
        ? labels.orderflowSellers
        : labels.orderflowBalanced;
  const orderflowPercent =
    setup.orderflowMode === "buyers_dominant"
      ? 80
      : setup.orderflowMode === "sellers_dominant"
        ? 30
        : 55;

  const directionLabel =
    setup.direction === "Long"
      ? labels.directionLong
      : labels.directionShort;

  const eventCaption = eventLabel;
  const biasCaption = `${
    labels.biasNeutral.split(":")[0] ?? "Bias"
  }: ${biasLabel.split(":").pop()?.trim() ?? biasLabel}`;
  const sentimentCaption = `${
    labels.sentimentNeutral.split(":")[0] ?? "Sentiment"
  }: ${sentimentLabel.split(":").pop()?.trim() ?? sentimentLabel}`;
  const orderflowCaption = orderflowLabel;

  return (
    <div className="h-full rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_rgba(4,7,15,0.98)] px-5 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] md:px-8 md:py-8">
      {/* Titel */}
      <div className="mb-6 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.26em] text-slate-300 md:text-[14px]">
          {title}
        </p>
      </div>

      {/* Obere Zeile: links Asset/Direction, rechts Confidence + 2×2 Ringe */}
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        {/* Left: Asset, Richtung, Signal */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-3xl font-semibold tracking-tight text-slate-50 md:text-[32px]">
              {`${setup.symbol} · ${setup.timeframe}`}
            </p>
            <p
              className={`text-xl font-semibold md:text-2xl ${
                setup.direction === "Long"
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {directionLabel}
            </p>
          </div>

          <p className="mt-1 text-[13px] text-slate-300">{weakLabel}</p>

          <div className="mt-1 inline-flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-sky-500/50 bg-sky-500/10 text-[11px] text-sky-300"
            >
              {setup.type === "rule_based"
                ? labels.assetTypeRuleBased
                : labels.assetTypeAi}
            </Badge>
          </div>
        </div>

        {/* Right: Confidence + 2×2 Score-Ringe */}
        <div className="flex flex-col items-center gap-6 md:items-end">
          <ConfidenceRing value={confidence} label={labels.confidence} />

          <div className="grid grid-cols-2 gap-x-6 gap-y-6">
            <RingStat
              valueLabel={eventCaption}
              percent={eventPercent}
              color="#38bdf8"
            />
            <RingStat
              valueLabel={biasCaption}
              percent={biasPercent}
              color="#22c55e"
            />
            <RingStat
              valueLabel={sentimentCaption}
              percent={sentimentPercent}
              color="#10b981"
            />
            <RingStat
              valueLabel={orderflowCaption}
              percent={orderflowPercent}
              color="#22d3ee"
            />
          </div>
        </div>
      </div>

      {/* Entry / Stop / Take row – zentriert */}
      <div className="mt-10 grid gap-6 rounded-2xl bg-black/25 px-4 py-4 text-center md:grid-cols-3 md:px-6 md:py-5">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
            {labels.entry}
          </div>
          <div className="text-base font-semibold text-slate-50 md:text-lg">
            {setup.entryZone.from.toFixed(4)} - {setup.entryZone.to.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
            {labels.stop}
          </div>
          <div className="text-base font-semibold text-rose-400 md:text-lg">
            {setup.stopLoss.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
            {labels.take}
          </div>
          <div className="text-base font-semibold text-emerald-400 md:text-lg">
            {setup.takeProfit.toFixed(4)}
          </div>
        </div>
      </div>

      {/* CTA – blauer Pill-Button, zentriert */}
      <div className="mt-7 flex justify-center">
        <a
          href={`${localePrefix}/setups`}
          className="inline-flex items-center rounded-full bg-sky-500 px-8 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(8,47,73,0.7)] transition hover:translate-y-[1px] hover:bg-sky-400"
        >
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
