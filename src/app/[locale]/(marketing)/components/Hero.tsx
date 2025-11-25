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
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <span aria-hidden="true" className="text-base">
          {icon}
        </span>
        <span className="font-medium text-slate-200">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export function Hero(): JSX.Element {
  const t = useT();
  return (
    <section className="grid gap-8 rounded-3xl bg-transparent p-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center">
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[0.7rem] text-sky-200 shadow-sm">
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
          className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300 underline decoration-sky-300 underline-offset-4 hover:text-sky-200"
        >
          {t("hero.linkPerception")}
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <HeroStat icon="📈" label={t("hero.stat.assets")} value="4" />
        <HeroStat icon="📊" label={t("hero.stat.setups")} value="4" />
        <HeroStat icon="⚡" label={t("hero.stat.strongSignals")} value="4" />
        <HeroStat icon="🛡️" label={t("hero.stat.weakSignals")} value="0" />
      </div>
    </section>
  );
}
