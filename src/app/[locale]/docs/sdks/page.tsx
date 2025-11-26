"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";
import { AppShell } from "@/src/components/layout/AppShell";

type PageProps = {
  params: { locale: string };
};

export default function DocsSdksPage({ params }: PageProps): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  const languages = [
    t("docs.sdks.languages.ts"),
    t("docs.sdks.languages.python"),
    t("docs.sdks.languages.other"),
  ];

  if (!isPro) {
    return (
      <AppShell section="docs">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <ProNotice context="docs" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell section="docs">
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("docs.sdks.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.sdks.intro")}</p>
        </header>

        <section className="space-y-3 pb-6">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.sdks.languages.title")}</h2>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] sm:text-base">
            {languages.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 pb-6">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.sdks.installation.title")}</h2>
          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3 font-mono text-sm">
              {t("docs.sdks.installation.bodyTs")}
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3 font-mono text-sm">
              {t("docs.sdks.installation.bodyPython")}
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.sdks.nextSteps.title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.sdks.nextSteps.body")}</p>
        </section>
      </div>
    </AppShell>
  );
}
