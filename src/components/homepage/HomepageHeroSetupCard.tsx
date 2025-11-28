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

// -----------------------------------------------------
// Ring für Event/Bias/Sentiment/Orderflow
// + leichter Hover-Move/Rotation über .group
// -----------------------------------------------------
function RingStat({
  valueLabel,
  percent,
  color,
}: {
  valueLabel: string;
  percent: number;
  color: string;
}): JSX.Element {
  const clamped = clamp(percent, 0, 100);
  return (
    <div
      className="flex flex-col items-center gap-2 transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-[0.5deg]"
      title={valueLabel}
    >
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-950"
        style={{
          backgroundImage: `conic-gradient(${color} ${clamped}%, rgba(15,23,42,0.7) ${clamped}%)`,
        }}
      >
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-[0_0_0_1px_rgba(148,163,184,0.45)]">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {clamped}%
          </span>
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-secondary)]">{valueLabel}</p>
    </div>
  );
}

// -----------------------------------------------------
// Confidence – großer Ring mit Glow/Puls
// -----------------------------------------------------
function ConfidenceRing({
  value,
  label,
}: {
  value: number;
  label: string;
}): JSX.Element {
  const v = clamp(value, 0, 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-300">
        {label}
      </span>

      <div className="relative">
        {/* weicher Glow, leichte Puls-Animation */}
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.55),_transparent_65%)] blur-xl opacity-80 animate-pulse" />

        <div
          className="relative flex h-28 w-28 items-center justify-center rounded-full"
          style={{
            backgroundImage: `conic-gradient(#22c55e ${v}%, rgba(15,23,42,0.5) ${v}%)`,
          }}
        >
          <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[var(--bg-surface)] shadow-[0_0_0_1px_rgba(148,163,184,0.45)]">
            <span className="text-lg font-bold text-white">
              {v.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// Haupt-Card
// -----------------------------------------------------
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

  // Werte für die 4 Ringe
  const eventPercent =
    setup.eventLevel === "high" ? 85 : setup.eventLevel === "medium" ? 60 : 35;
  const eventLabel =
    setup.eventLevel === "high"
      ? labels.eventHigh
      : setup.eventLevel === "medium"
      ? labels.eventMedium
      : labels.eventLow;

  const biasPercent = clamp(setup.bias.strength, 0, 100);
  const biasLabel =
    setup.bias.direction === "Bullish"
      ? labels.biasBullish
      : setup.bias.direction === "Bearish"
      ? labels.biasBearish
      : labels.biasNeutral;

  const sentimentPercent = clamp(
    Math.round(((setup.sentimentScore + 1) / 2) * 100),
    0,
    100
  );
  const sentimentLabel =
    setup.sentimentScore > 0.2
      ? labels.sentimentPositive
      : setup.sentimentScore < -0.2
      ? labels.sentimentNegative
      : labels.sentimentNeutral;

  const orderflowPercent =
    setup.orderflowMode === "buyers_dominant"
      ? 80
      : setup.orderflowMode === "sellers_dominant"
      ? 30
      : 55;

  const orderflowLabel =
    setup.orderflowMode === "buyers_dominant"
      ? labels.orderflowBuyers
      : setup.orderflowMode === "sellers_dominant"
      ? labels.orderflowSellers
      : labels.orderflowBalanced;

  const directionLabel =
    setup.direction === "Long"
      ? labels.directionLong
      : labels.directionShort;

  const directionArrow = setup.direction === "Long" ? "↑" : "↓";

  return (
    <div className="h-full rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_rgba(4,7,15,0.98)] px-5 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] md:px-8 md:py-8">
      {/* Titel */}
      <div className="mb-3 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.26em] text-slate-300 md:text-[14px]">
          {title}
        </p>
      </div>

      {/* Asset + Richtung */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-4xl font-bold tracking-tight text-white">
          {setup.symbol} · {setup.timeframe}
        </p>

        <div className="flex items-center gap-2">
          <span
            className={`text-lg font-semibold ${
              setup.direction === "Long" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {directionArrow}
          </span>
          <p
            className={`text-xl font-semibold ${
              setup.direction === "Long" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {directionLabel}
          </p>
        </div>
      </div>

      {/* feine Divider-Linie wie bei Linear */}
      <div className="mx-auto mt-4 h-px w-full max-w-xl bg-gradient-to-r from-transparent via-sky-500/70 to-transparent opacity-80" />

      {/* Rings + Confidence – eine Zeile, zentriert, mit group-hover-Animation */}
      <div className="mt-8 flex w-full justify-center">
        <div className="group flex items-center justify-center gap-10 md:gap-16">
          <RingStat
            valueLabel={eventLabel}
            percent={eventPercent}
            color="#38bdf8"
          />
          <RingStat
            valueLabel={biasLabel}
            percent={biasPercent}
            color="#22c55e"
          />

          <ConfidenceRing value={confidence} label={labels.confidence} />

          <RingStat
            valueLabel={sentimentLabel}
            percent={sentimentPercent}
            color="#10b981"
          />
          <RingStat
            valueLabel={orderflowLabel}
            percent={orderflowPercent}
            color="#22d3ee"
          />
        </div>
      </div>

      {/* Zusammenfassung – dynamisch aus Werten gebaut */}
      <div className="mt-10 rounded-2xl bg-black/30 px-6 py-4 text-center text-sm text-slate-200">
        {setup.symbol} wird aktuell mit {confidence.toFixed(1)}% Confidence
        bewertet. Event: {eventLabel}, Bias: {biasLabel}, Sentiment:{" "}
        {sentimentLabel}, Orderflow: {orderflowLabel}.
      </div>

      {/* Entry / Stop / Target */}
      <div className="mt-10 grid gap-6 rounded-2xl bg-black/25 px-6 py-6 text-center md:grid-cols-3">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
            {labels.entry}
          </div>
          <div className="text-lg font-semibold text-white">
            {setup.entryZone.from.toFixed(4)} – {setup.entryZone.to.toFixed(4)}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
            {labels.stop}
          </div>
          <div className="text-lg font-semibold text-rose-400">
            {setup.stopLoss.toFixed(4)}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
            {labels.take}
          </div>
          <div className="text-lg font-semibold text-emerald-400">
            {setup.takeProfit.toFixed(4)}
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="mt-8 flex justify-center">
        <a
          href={`${localePrefix}/setups`}
          className="inline-flex items-center rounded-full bg-sky-500 px-8 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(8,47,73,0.7)] transition hover:translate-y-[1px] hover:bg-sky-400"
        >
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
