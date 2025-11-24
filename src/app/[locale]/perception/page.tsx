"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "../../../lib/i18n/ClientProvider";

const steps = (t: (key: string) => string) => [
  { title: t("perception.engine.marketstructure"), description: t("perception.engine.marketstructure") },
  { title: t("perception.engine.events"), description: t("perception.engine.events") },
  { title: t("perception.engine.sentiment"), description: t("perception.engine.sentiment") },
  { title: t("perception.engine.scoring"), description: t("perception.engine.scoring") },
];

export default function PerceptionPage(): JSX.Element {
  const t = useT();
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const stepItems = steps(t);

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:py-10">
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("perception.title")}</h1>
          <div className="space-y-3 text-sm text-[var(--text-secondary)] sm:text-base">
            <p>{t("perception.intro1")}</p>
            <p>{t("perception.intro2")}</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("perception.subtitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stepItems.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
              >
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-2 text-xs text-[var(--text-secondary)] sm:text-sm">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("perception.snapshotHint")}</h2>
          <div className="max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[var(--text-secondary)]">Datum</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{today}</div>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--text-primary)]">
                Snapshot Engine aktiv
              </span>
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)] sm:text-sm">{t("perception.snapshotHint")}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
