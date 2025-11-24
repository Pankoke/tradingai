"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { i18nConfig, type Locale } from "../../../../lib/i18n/config";

export type Direction = "Long" | "Short";

export type SetupCardSetup = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: Direction;
  confidence: number;
  eventScore: number;
  biasScore: number;
  sentimentScore: number;
  balanceScore: number;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  type: "Regelbasiert" | "KI";
};

type SetupCardProps = {
  setup: SetupCardSetup;
  highlight?: boolean;
};

type GaugeProps = {
  label?: string;
  value: number;
};

type LevelProps = {
  label: string;
  value: string;
  tone: "neutral" | "danger" | "success";
};

function localePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

export function SetupCard({ setup, highlight = false }: SetupCardProps): JSX.Element {
  const isLong = setup.direction === "Long";
  const pathname = usePathname();
  const prefix = useMemo(() => localePrefix(pathname), [pathname]);

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 ${highlight ? "shadow-lg shadow-[rgba(34,197,94,0.2)]" : "shadow-md"}`}
    >
      <header className="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1 text-[0.65rem] font-semibold">
          {setup.type}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem]">Confidence</span>
          <MiniGauge value={setup.confidence} />
        </div>
      </header>

      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="text-base font-semibold text-[var(--text-primary)]">
            {setup.symbol} · {setup.timeframe}
          </div>
          <span
            className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${
              isLong
                ? "border-emerald-500/40 text-emerald-400"
                : "border-red-500/40 text-red-400"
            }`}
          >
            {setup.direction}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <MiniGauge label="Event" value={setup.eventScore} />
        <MiniGauge label="Bias" value={setup.biasScore} />
        <MiniGauge label="Sentiment" value={setup.sentimentScore} />
        <MiniGauge label="Ausgewogen" value={setup.balanceScore} />
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-3">
        <Level label="Entry-Zone" value={setup.entryZone} tone="neutral" />
        <Level label="Take-Profit" value={setup.takeProfit} tone="success" />
        <Level label="Stop-Loss" value={setup.stopLoss} tone="danger" />
      </div>

      <div className="flex justify-end">
        <Link
          href={`${prefix}/setups/${setup.id}`}
          className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-black shadow-[0_10px_15px_rgba(34,197,94,0.2)] transition hover:opacity-90"
        >
          Analyse öffnen
        </Link>
      </div>
    </article>
  );
}

function MiniGauge({ label, value }: GaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)]"
        style={{
          background: `conic-gradient(var(--accent) ${clamped}%, rgba(7,12,24,0.9) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[68%] w-[68%] items-center justify-center rounded-full bg-[var(--bg-surface)] text-xs font-semibold text-white">
          {clamped}%
        </div>
      </div>
      {label ? <span className="text-[0.7rem] text-[var(--text-secondary)]">{label}</span> : null}
    </div>
  );
}

function Level({ label, value, tone }: LevelProps): JSX.Element {
  const color =
    tone === "danger"
      ? "text-red-400"
      : tone === "success"
        ? "text-emerald-400"
        : "text-[var(--text-primary)]";

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
