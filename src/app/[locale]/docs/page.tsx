"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "../../../lib/i18n/ClientProvider";

type CardProps = {
  title: string;
  body: string;
};

export default function DocsOverviewPage(): JSX.Element {
  const t = useT();

  const whatYouCanDo: CardProps[] = [
    { title: t("docs.overview.whatYouCanDo.setups.title"), body: t("docs.overview.whatYouCanDo.setups.body") },
    { title: t("docs.overview.whatYouCanDo.events.title"), body: t("docs.overview.whatYouCanDo.events.body") },
    { title: t("docs.overview.whatYouCanDo.sentiment.title"), body: t("docs.overview.whatYouCanDo.sentiment.body") },
    {
      title: t("docs.overview.whatYouCanDo.automation.title"),
      body: t("docs.overview.whatYouCanDo.automation.body"),
    },
  ];

  const concepts = [
    t("docs.overview.concepts.setup"),
    t("docs.overview.concepts.event"),
    t("docs.overview.concepts.score"),
    t("docs.overview.concepts.stream"),
  ];

  const limits = [
    t("docs.overview.limits.point1"),
    t("docs.overview.limits.point2"),
    t("docs.overview.limits.point3"),
  ];

  const quickstart = [
    { title: t("docs.overview.quickstart.step1Title"), body: t("docs.overview.quickstart.step1Body") },
    { title: t("docs.overview.quickstart.step2Title"), body: t("docs.overview.quickstart.step2Body") },
    { title: t("docs.overview.quickstart.step3Title"), body: t("docs.overview.quickstart.step3Body") },
  ];

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("docs.overview.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.overview.intro")}</p>
        </header>

        <section className="space-y-3 pb-8">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.overview.whatYouCanDo.title")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {whatYouCanDo.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-md"
              >
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-2 text-xs text-[var(--text-secondary)] sm:text-sm">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3 pb-8">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.overview.quickstart.title")}</h2>
          <ol className="space-y-3 text-sm text-[var(--text-secondary)] sm:text-base">
            {quickstart.map((step) => (
              <li key={step.title} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                <div className="font-semibold text-[var(--text-primary)]">{step.title}</div>
                <div className="text-xs sm:text-sm">{step.body}</div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3 pb-8">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.overview.concepts.title")}</h2>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] sm:text-base">
            {concepts.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 text-[var(--accent)]">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.overview.limits.title")}</h2>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] sm:text-base">
            {limits.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 text-[var(--accent)]">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
