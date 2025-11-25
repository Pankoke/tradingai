"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";

type HeroStatProps = {
  label: string;
  value: string;
  icon: string;
};

function HeroStat({ label, value, icon }: HeroStatProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-4 shadow-[0_10px_25px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span aria-hidden="true" className="text-base">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export function Hero(): JSX.Element {
  const t = useT();
  return (
    <section className="grid gap-8 rounded-3xl bg-[#060b18] p-6 ring-1 ring-white/5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.7rem] text-slate-200 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
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
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0ea5e9] underline decoration-[#0ea5e9] underline-offset-4 hover:brightness-110"
        >
          {t("hero.linkPerception")}
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HeroStat icon="📈" label={t("hero.stat.assets")} value="1" />
        <HeroStat icon="📊" label={t("hero.stat.setups")} value="4" />
        <HeroStat icon="⚡" label={t("hero.stat.strongSignals")} value="2" />
        <HeroStat icon="🛡️" label={t("hero.stat.weakSignals")} value="2" />
      </div>
    </section>
  );
}
