"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";
import { formatNumberText, formatRangeText } from "@/src/lib/formatters/levels";
import { isEventModifierEnabledClient } from "@/src/lib/config/eventModifier";
import { deriveSetupProfileFromTimeframe } from "@/src/lib/config/setupProfile";

export type Direction = "Long" | "Short";

export type SetupCardSetup = Setup;

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
  const t = useT();
  const profile = setup.profile ?? deriveSetupProfileFromTimeframe(setup.timeframe);
  const modifierEnabled = isEventModifierEnabledClient();
  const accessTone =
    setup.accessLevel === "free"
      ? "border-slate-600 text-slate-200"
      : setup.accessLevel === "premium"
        ? "border-amber-500/60 text-amber-300"
        : "border-emerald-500/70 text-emerald-300";
  const accessLabel =
    setup.accessLevel === "free"
      ? t("setups.access.free")
      : setup.accessLevel === "premium"
        ? t("setups.access.premium")
        : t("setups.access.pro");

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 ${highlight ? "shadow-lg shadow-black/30" : "shadow-md shadow-black/20"}`}
    >
      <header className="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.25em] text-slate-400">
        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[0.65rem] font-semibold text-slate-100">
          {setup.type === "Regelbasiert" ? t("setups.type.ruleBased") : t("setups.type.ai")}
        </span>
        <span className={`rounded-full border px-3 py-1 text-[0.65rem] font-semibold ${accessTone}`}>
          {accessLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] text-slate-300">Confidence</span>
          <MiniGauge value={setup.confidence} />
        </div>
      </header>

      <div className="flex items-center justify-between gap-2">

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-100">
            <span>
              {setup.symbol} ?? {setup.timeframe}
            </span>
            {profile ? (
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.18em] text-slate-200">
                {profile}
              </span>
            ) : null}
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
        {!modifierEnabled ? <MiniGauge label={t("setups.event")} value={setup.eventScore} /> : null}
        <MiniGauge label={t("setups.bias")} value={setup.biasScore} />
        <MiniGauge label={t("setups.sentiment")} value={setup.sentimentScore} />
        <MiniGauge label={t("setups.balance")} value={setup.balanceScore} />
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-3">
        <Level label={t("setups.entry")} value={formatRangeText(setup.entryZone)} tone="neutral" />
        <Level label={t("setups.takeProfit")} value={formatNumberText(setup.takeProfit)} tone="success" />
        <Level label={t("setups.stopLoss")} value={formatNumberText(setup.stopLoss)} tone="danger" />
      </div>

      {/* CTA removed for simplified marketing card */}
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

