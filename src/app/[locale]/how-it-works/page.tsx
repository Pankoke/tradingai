"use client";

import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { useT } from "@/src/lib/i18n/ClientProvider";

const modules = (t: (key: string) => string) => [
  t("perception.modules.marketStructure"),
  t("perception.modules.events"),
  t("perception.modules.sentiment"),
  t("perception.modules.scoring"),
];

type SectionCardProps = {
  title: string;
  children: React.ReactNode;
};

function SectionCard({ title, children }: SectionCardProps): JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] sm:text-xl">
        {title}
      </h2>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-[1.5px] shadow-sm dark:border-transparent dark:from-sky-500/15 dark:via-transparent dark:to-emerald-500/10 dark:shadow-[0_0_25px_rgba(56,189,248,0.15)]">
        <div className="rounded-3xl border border-slate-800 bg-[#0b1325] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:p-7">
          {children}
        </div>
      </div>
    </section>
  );
}

export default function HowItWorksPage(): JSX.Element {
  const t = useT();
  const items = modules(t);

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:py-12">
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {t("perception.title")}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">
            {t("perception.subtitle")}
          </p>
        </section>

        <SectionCard title={t("perception.howItWorksTitle")}>
          <p className="text-xs text-slate-400 sm:text-sm">
            {t("ui.tooltip.confidence")}
          </p>
          <p className="text-sm text-slate-200 sm:text-base">
            {t("perception.howItWorksText")}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <article
                key={item}
                className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                {item}
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t("perception.outputTitle")}>
          <p className="text-xs text-slate-400 sm:text-sm">
            {t("ui.tooltip.snapshot")}
          </p>
          <p className="text-sm text-slate-200 sm:text-base">
            {t("perception.outputText")}
          </p>
        </SectionCard>

        <SectionCard title={t("perception.linksTitle")}>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/setups"
              className="rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-200 shadow-[0_10px_30px_rgba(56,189,248,0.25)] transition hover:bg-sky-500/20"
            >
              {t("perception.linkSetupOfDay")}
            </Link>
            <Link
              href="/setups/premium"
              className="rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-sm font-medium text-slate-100 hover:border-slate-400 hover:bg-slate-800"
            >
              {t("perception.linkAllSetups")}
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
