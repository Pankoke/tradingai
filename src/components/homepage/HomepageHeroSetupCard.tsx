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
    <div className="flex flex-col items-center gap-2" title={valueLabel}>
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-900/60"
        style={{
          backgroundImage: `conic-gradient(${color} ${clamped}%, #e2e8f0 ${clamped}%)`,
        }}
      >
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-inner shadow-slate-400/30 dark:bg-slate-950/80 dark:shadow-black/30">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{clamped}%</span>
        </div>
      </div>
      <p className="text-[11px] text-slate-600 dark:text-slate-300">{valueLabel}</p>
    </div>
  );
}

export default function HomepageHeroSetupCard({ setup, title, weakLabel, ctaLabel, labels }: Props): JSX.Element {
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
  const eventPercent = setup.eventLevel === "high" ? 85 : setup.eventLevel === "medium" ? 60 : 35;
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
  const sentimentPercent = clamp(Math.round(((setup.sentimentScore + 1) / 2) * 100), 0, 100);
  const orderflowLabel =
    setup.orderflowMode === "buyers_dominant"
      ? labels.orderflowBuyers
      : setup.orderflowMode === "sellers_dominant"
        ? labels.orderflowSellers
        : labels.orderflowBalanced;
  const orderflowPercent =
    setup.orderflowMode === "buyers_dominant" ? 80 : setup.orderflowMode === "sellers_dominant" ? 30 : 55;
  const directionLabel = setup.direction === "Long" ? labels.directionLong : labels.directionShort;
  const eventCaption = eventLabel;
  const biasCaption = `${labels.biasNeutral.split(":")[0] ?? "Bias"}: ${biasLabel.split(":").pop()?.trim() ?? biasLabel}`;
  const sentimentCaption =
    `${labels.sentimentNeutral.split(":")[0] ?? "Sentiment"}: ${
      sentimentLabel.split(":").pop()?.trim() ?? sentimentLabel
    }`;
  const orderflowCaption = orderflowLabel;

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/85 dark:shadow-2xl dark:shadow-black/40">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
            {`${setup.symbol} · ${setup.timeframe}`}
          </p>
          <h2
            className={`text-4xl font-semibold ${
              setup.direction === "Long" ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"
            }`}
          >
            {directionLabel}
          </h2>
          {setup.weakSignal ? (
            <Badge className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
              {weakLabel}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-1 items-center justify-center gap-4">
          <RingStat valueLabel={eventCaption} percent={eventPercent} color="#38bdf8" />
          <RingStat valueLabel={biasCaption} percent={biasPercent} color="#22c55e" />
          <RingStat valueLabel={sentimentCaption} percent={sentimentPercent} color="#10b981" />
          <RingStat valueLabel={orderflowCaption} percent={orderflowPercent} color="#22d3ee" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <div
            className="relative flex h-44 w-44 items-center justify-center rounded-full bg-slate-200 shadow-md shadow-emerald-500/10 dark:bg-slate-900/60 dark:shadow-lg"
            style={{
              backgroundImage: `conic-gradient(#2dd4bf ${confidence}%, #e2e8f0 ${confidence}%)`,
            }}
            title={`${Math.round(confidence)}% ${labels.confidence}`}
          >
            <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white shadow-inner shadow-slate-400/40 dark:bg-slate-950/90 dark:shadow-black/50">
              <span className="text-3xl font-semibold text-slate-900 dark:text-white">{Math.round(confidence)}%</span>
              <span className="text-xs text-slate-600 dark:text-slate-300">{labels.confidence}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.entry}</div>
          <div className="text-base font-semibold text-slate-900 md:text-lg dark:text-slate-50">
            {setup.entryZone.from.toFixed(4)} - {setup.entryZone.to.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.stop}</div>
          <div className="text-base font-semibold text-rose-600 md:text-lg dark:text-rose-400">{setup.stopLoss.toFixed(4)}</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.take}</div>
          <div className="text-base font-semibold text-emerald-600 md:text-lg dark:text-emerald-400">{setup.takeProfit.toFixed(4)}</div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <a
          href={`${localePrefix}/setups`}
          className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:translate-x-0.5 hover:shadow-sky-400/30"
        >
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
