"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { useT } from "@/src/lib/i18n/ClientProvider";

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

export function SetupCard({ setup, highlight = false }: SetupCardProps): JSX.Element {
  const isLong = setup.direction === "Long";
  const pathname = usePathname();
  const prefix = useMemo(() => localePrefix(pathname), [pathname]);
  const t = useT();

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 ${highlight ? "shadow-lg shadow-black/30" : "shadow-md shadow-black/20"}`}
    >
      <header className="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.25em] text-slate-400">
        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[0.65rem] font-semibold text-slate-100">
          {setup.type === "Regelbasiert" ? t("setups.type.ruleBased") : t("setups.type.ai")}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] text-slate-300">Confidence</span>
          <MiniGauge value={setup.confidence} />
        </div>
      </header>

      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="text-base font-semibold text-slate-100">
            {setup.symbol} · {setup.timeframe}
          </div>
          <span
            className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs font-semibold ${
              isLong ? "border-emerald-500/60 text-emerald-300" : "border-rose-500/60 text-rose-300"
            }`}
          >
            {setup.direction}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <MiniGauge label={t("setups.event")} value={setup.eventScore} />
        <MiniGauge label={t("setups.bias")} value={setup.biasScore} />
        <MiniGauge label={t("setups.sentiment")} value={setup.sentimentScore} />
        <MiniGauge label={t("setups.balance")} value={setup.balanceScore} />
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-3">
        <Level label={t("setups.entry")} value={formatRangeText(setup.entryZone)} tone="neutral" />
        <Level label={t("setups.takeProfit")} value={formatNumberText(setup.takeProfit)} tone="success" />
        <Level label={t("setups.stopLoss")} value={formatNumberText(setup.stopLoss)} tone="danger" />
      </div>

      <div className="flex justify-end">
        <Link
          href={`${prefix}/setups/${setup.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0ea5e9] px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_15px_rgba(14,165,233,0.25)] transition hover:brightness-105"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden />
          <span>{t("setups.openAnalysis")}</span>
        </Link>
      </div>
    </article>
  );
}

function MiniGauge({ label, value }: GaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  const display = Math.round(clamped);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
        style={{
          background: `conic-gradient(#22c55e ${clamped}%, rgba(100,116,139,0.4) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[68%] w-[68%] items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
          {display}%
        </div>
      </div>
      {label ? <span className="text-[0.7rem] text-slate-400">{label}</span> : null}
    </div>
  );
}

function Level({ label, value, tone }: LevelProps): JSX.Element {
  const color =
    tone === "danger" ? "text-rose-400" : tone === "success" ? "text-emerald-400" : "text-slate-100";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
