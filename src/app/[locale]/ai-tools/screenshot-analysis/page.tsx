"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";

export default function ScreenshotAnalysisPage({ params }: { params: { locale: string } }): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("screenshotAnalysis.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("screenshotAnalysis.intro")}</p>
        </header>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 shadow-md">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">
            {t("screenshotAnalysis.comingSoonTitle")}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("screenshotAnalysis.comingSoonBody")}</p>
          <div className="mt-6 flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-secondary)]">
            {t("screenshotAnalysis.placeholder")}
          </div>
        </section>
      </div>
    </div>
  );
}
