"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";

type HeroStatProps = {
  label: string;
  value: string;
  icon: string;
};

function HeroStat({ label, value, icon }: HeroStatProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <span aria-hidden="true" className="text-base">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

export function Hero(): JSX.Element {
  const t = useT();

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-[1.5px] shadow-sm dark:border-transparent dark:from-sky-500/15 dark:via-transparent dark:to-emerald-500/10 dark:shadow-[0_0_25px_rgba(56,189,248,0.15)]">
      <div className="rounded-3xl border border-slate-800 bg-[#0b1325] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:p-8">

        <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center">

          {/* LEFT SIDE: Text */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[0.75rem] text-sky-200 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
              <span className="font-medium">{t("hero.badge")}</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
                {t("hero.title")}
              </h1>
              <p className="max-w-2xl text-sm text-slate-200 sm:text-base">
                {t("hero.subtitle")}
              </p>
            </div>

            <a
              href="#perception-lab"
              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300 underline underline-offset-4 hover:text-sky-200"
            >
              {t("hero.linkPerception")}
            </a>
          </div>

          {/* RIGHT SIDE: Stats */}
          <div className="grid gap-3 sm:grid-cols-2">
            <HeroStat icon="📈" label={t("hero.stat.assets")} value="4" />
            <HeroStat icon="📊" label={t("hero.stat.setups")} value="4" />
            <HeroStat icon="⚡" label={t("hero.stat.strongSignals")} value="4" />
            <HeroStat icon="🛡️" label={t("hero.stat.weakSignals")} value="0" />
          </div>
        </div>
      </div>
    </section>
  );
}
