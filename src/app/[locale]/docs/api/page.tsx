"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";

type PageProps = {
  params: { locale: string };
};

export default function DocsApiPage({ params }: PageProps): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;

  const endpoints = [
    t("docs.api.endpoints.setups"),
    t("docs.api.endpoints.setupDetail"),
    t("docs.api.endpoints.events"),
    t("docs.api.endpoints.sentiment"),
  ];

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("docs.api.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.api.intro")}</p>
        </header>

        <section className="space-y-2 pb-6">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.api.baseUrlLabel")}</h2>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3 font-mono text-sm">
            {t("docs.api.baseUrlValue")}
          </div>
        </section>

        <section className="space-y-2 pb-6">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.api.auth.title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.api.auth.body")}</p>
        </section>

        <section className="space-y-3 pb-6">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.api.endpoints.title")}</h2>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] sm:text-base">
            {endpoints.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.api.notes.title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.api.notes.body")}</p>
        </section>
      </div>
    </div>
  );
}
