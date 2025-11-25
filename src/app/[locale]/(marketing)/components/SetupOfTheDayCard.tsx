"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../../../../lib/i18n/ClientProvider";
import type { SetupCardSetup } from "./SetupCard";
import { i18nConfig, type Locale } from "../../../../lib/i18n/config";

type SetupOfTheDayCardProps = {
  setup: SetupCardSetup;
};

type GaugeProps = {
  label?: string;
  value: number;
  tone?: "accent" | "green" | "teal" | "neutral";
};

type LevelBoxPropsDay = {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "success";
};

function localePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

function formatNumberText(value: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return num.toFixed(4);
}

function formatRangeText(value: string): string {
  const matches = value.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return value;
  if (matches.length === 1) return Number(matches[0]).toFixed(4);
  const [a, b] = matches.map((v) => Number(v));
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return `${a.toFixed(4)} - ${b.toFixed(4)}`;
  }
  return value;
}

function toneClass(tone: LevelBoxPropsDay["tone"]): string {
  if (tone === "danger") return "text-red-400";
  if (tone === "success") return "text-emerald-400";
  return "text-slate-100";
}

export function SetupOfTheDayCard({ setup }: SetupOfTheDayCardProps): JSX.Element {
  const t = useT();
  const isLong = setup.direction === "Long";
  const pathname = usePathname();
  const prefix = useMemo(() => localePrefix(pathname), [pathname]);

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-[#0b1325] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.35em] text-slate-300">
              {t("setups.setupOfTheDay")}
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {setup.symbol.toUpperCase()} · {setup.timeframe}
            </h2>
            <p className={`text-3xl font-bold ${isLong ? "text-emerald-400" : "text-rose-400"}`}>
              {setup.direction}
            </p>
            <span className="inline-flex w-fit rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
              {setup.type === "Regelbasiert" ? t("setups.type.ruleBased") : t("setups.type.ai")}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SmallGauge label={`${t("setups.event")}: schwach`} value={setup.eventScore} tone="accent" />
            <SmallGauge label={`${t("setups.bias")}: bullish`} value={setup.biasScore} tone="green" />
            <SmallGauge label={`${t("setups.sentiment")}: positiv`} value={setup.sentimentScore} tone="green" />
            <SmallGauge label={t("setups.balance")} value={setup.balanceScore} tone="accent" />
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center lg:mt-0 lg:w-64 lg:items-end">
          <BigGauge value={setup.confidence} />
        </div>
      </div>

      <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="grid gap-4 text-xs sm:grid-cols-3">
          <LevelBox label={t("setups.entry")} value={formatRangeText(setup.entryZone)} tone="neutral" />
          <LevelBox label={t("setups.stopLoss")} value={formatNumberText(setup.stopLoss)} tone="danger" />
          <LevelBox label={t("setups.takeProfit")} value={formatNumberText(setup.takeProfit)} tone="success" />
        </div>
      </div>

      <div className="mt-1 flex justify-end">
        <Link
          href={`${prefix}/setups/${setup.id}`}
          className="rounded-full bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition hover:brightness-110"
        >
          {t("setups.openAnalysis")}
        </Link>
      </div>
    </section>
  );
}

function SmallGauge({ label, value, tone = "accent" }: GaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  const display = Math.round(clamped);
  const toneColor =
    tone === "green" ? "#22c55e" : tone === "teal" ? "#14b8a6" : tone === "neutral" ? "#475569" : "#0ea5e9";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${toneColor} ${clamped}%, rgba(226,232,240,0.15) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[68%] w-[68%] items-center justify-center rounded-full bg-slate-900">
          <span className="text-xs font-semibold text-white">{display}%</span>
        </div>
      </div>
      {label ? <span className="text-[0.7rem] text-slate-300">{label}</span> : null}
    </div>
  );
}

function BigGauge({ value }: GaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  const display = Math.round(clamped);

  return (
    <div className="flex flex-col items-center gap-2 lg:items-end">
      <div
        className="relative flex h-36 w-36 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#22c55e ${clamped}%, rgba(226,232,240,0.15) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[68%] w-[68%] flex-col items-center justify-center rounded-full bg-slate-900 shadow-inner shadow-black/40">
          <span className="text-3xl font-bold text-white">{display}%</span>
          <span className="text-[0.65rem] text-slate-300">Confidence</span>
        </div>
      </div>
    </div>
  );
}

function LevelBox({ label, value, tone = "neutral" }: LevelBoxPropsDay): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass(tone)}`}>{value}</div>
    </div>
  );
}
