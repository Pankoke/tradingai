"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../../../../lib/i18n/ClientProvider";
import type { SetupCardSetup } from "./SetupCard";
import { i18nConfig, type Locale } from "../../../../lib/i18n/config";

function localePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

type SetupOfTheDayCardProps = {
  setup: SetupCardSetup;
};

type GaugeProps = {
  label?: string;
  value: number;
};

type LevelBoxPropsDay = {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "success";
};

function toneClass(tone: LevelBoxPropsDay["tone"]): string {
  if (tone === "danger") return "text-red-400";
  if (tone === "success") return "text-emerald-400";
  return "text-[var(--text-primary)]";
}

export function SetupOfTheDayCard({ setup }: SetupOfTheDayCardProps): JSX.Element {
  const t = useT();
  const isLong = setup.direction === "Long";
  const pathname = usePathname();
  const prefix = useMemo(() => localePrefix(pathname), [pathname]);

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-lg shadow-[rgba(0,0,0,0.35)] ring-1 ring-[rgba(34,197,94,0.08)] sm:p-6 lg:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.35em] text-[var(--text-secondary)]">
              {t("setups.setupOfTheDay")}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {setup.symbol.toUpperCase()} · {setup.timeframe}
            </h2>
            <p className={`text-2xl font-semibold ${isLong ? "text-emerald-400" : "text-red-400"}`}>
              {setup.direction}
            </p>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1 text-xs font-semibold">
              {setup.type === "Regelbasiert" ? t("setups.type.ruleBased") : t("setups.type.ai")}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SmallGauge label={t("setups.event")} value={setup.eventScore} />
            <SmallGauge label={t("setups.bias")} value={setup.biasScore} />
            <SmallGauge label={t("setups.sentiment")} value={setup.sentimentScore} />
            <SmallGauge label={t("setups.balance")} value={setup.balanceScore} />
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center lg:mt-0 lg:w-64 lg:items-end">
          <BigGauge value={setup.confidence} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-[var(--border-subtle)] pt-4 text-xs sm:grid-cols-3">
        <LevelBox label={t("setups.entry")} value={setup.entryZone} tone="neutral" />
        <LevelBox label={t("setups.stopLoss")} value={setup.stopLoss} tone="danger" />
        <LevelBox label={t("setups.takeProfit")} value={setup.takeProfit} tone="success" />
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href={`${prefix}/setups/${setup.id}`}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-black shadow-[0_10px_20px_rgba(34,197,94,0.25)] transition hover:opacity-90"
        >
          {t("setups.openAnalysis")}
        </Link>
      </div>
    </section>
  );
}

function SmallGauge({ label, value }: GaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20"
        style={{
          background: `conic-gradient(var(--accent) ${clamped}%, rgba(7,12,24,0.9) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[70%] w-[70%] items-center justify-center rounded-full bg-[var(--bg-surface)]">
          <span className="text-xs font-semibold text-white">{clamped}%</span>
        </div>
      </div>
      {label ? <span className="text-[0.7rem] text-[var(--text-secondary)]">{label}</span> : null}
    </div>
  );
}

function BigGauge({ value }: GaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col items-center gap-2 lg:items-end">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full sm:h-32 sm:w-32"
        style={{
          background: `conic-gradient(var(--accent) ${clamped}%, rgba(7,12,24,0.9) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[70%] w-[70%] flex-col items-center justify-center rounded-full bg-[var(--bg-surface)]">
          <span className="text-2xl font-semibold text-white">{clamped}%</span>
          <span className="text-[0.65rem] uppercase tracking-wide text-[var(--text-secondary)]">
            Confidence
          </span>
        </div>
      </div>
    </div>
  );
}

function LevelBox({ label, value, tone = "neutral" }: LevelBoxPropsDay): JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-3 shadow-inner shadow-[rgba(0,0,0,0.25)]">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${toneClass(tone)}`}>{value}</div>
    </div>
  );
}
