 "use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "../../../lib/i18n/ClientProvider";

const modules = (t: (key: string) => string) => [
  t("perception.modules.marketStructure"),
  t("perception.modules.events"),
  t("perception.modules.sentiment"),
  t("perception.modules.scoring"),
];

export default function PerceptionPage(): JSX.Element {
  const t = useT();
  const items = modules(t);

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:py-10">
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("perception.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("perception.subtitle")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("perception.howItWorksTitle")}</h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("perception.howItWorksText")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <article
                key={item}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]"
              >
                {item}
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("perception.outputTitle")}</h2>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
            {t("perception.outputText")}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("perception.linksTitle")}</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="/setups"
              className="rounded-full bg-[var(--accent)] px-3 py-1.5 font-semibold text-black hover:opacity-90"
            >
              {t("perception.linkSetupOfDay")}
            </a>
            <a
              href="/setups/premium"
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
            >
              {t("perception.linkAllSetups")}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
