"use client";

import React from "react";
import type { JSX } from "react";
import { useT } from "../../../../lib/i18n/ClientProvider";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";

type PageProps = {
  params: { locale: string };
};

export default function DocsWebhooksPage({ params }: PageProps): JSX.Element {
  const t = useT();
  const { locale } = params;
  void locale;
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  const steps = [
    t("docs.webhooks.howItWorks.step1"),
    t("docs.webhooks.howItWorks.step2"),
    t("docs.webhooks.howItWorks.step3"),
  ];

  const events = [t("docs.webhooks.events.setupsCreated"), t("docs.webhooks.events.scoreChanged")];

  if (!isPro) {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <ProNotice context="docs" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("docs.webhooks.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.webhooks.intro")}</p>
        </header>

        <section className="space-y-3 pb-6">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.webhooks.howItWorks.title")}</h2>
          <ol className="space-y-2 text-sm text-[var(--text-secondary)] sm:text-base">
            {steps.map((step, index) => (
              <li
                key={step}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2"
              >
                <span className="font-semibold text-[var(--text-primary)]">{index + 1}. </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3 pb-6">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.webhooks.events.title")}</h2>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] sm:text-base">
            {events.map((item) => (
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
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("docs.webhooks.security.title")}</h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("docs.webhooks.security.body")}</p>
        </section>
      </div>
    </div>
  );
}
