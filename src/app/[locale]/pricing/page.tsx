"use client";

import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../../../lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
};

type ComparisonRow = {
  feature: string;
  free: string;
  premium: string;
  pro: string;
};

export default function Page(): JSX.Element {
  const t = useT();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const locale: Locale = i18nConfig.locales.includes(maybeLocale as Locale)
    ? (maybeLocale as Locale)
    : i18nConfig.defaultLocale;
  const localePrefix = `/${locale}`;

  const plans: Plan[] = [
    {
      name: t("pricing.free.title"),
      price: t("pricing.free.price"),
      description: t("pricing.subtitle"),
      features: [
        t("pricing.free.feature1"),
        t("pricing.free.feature2"),
        t("pricing.free.feature3"),
        t("pricing.free.feature4"),
      ],
      cta: t("pricing.free.cta"),
    },
    {
      name: t("pricing.premium.title"),
      price: t("pricing.premium.price"),
      description: t("pricing.subtitle"),
      features: [
        t("pricing.premium.feature1"),
        t("pricing.premium.feature2"),
        t("pricing.premium.feature3"),
        t("pricing.premium.feature4"),
        t("pricing.premium.feature5"),
      ],
      cta: t("pricing.premium.cta"),
      highlighted: true,
      badge: t("pricing.badge.recommended"),
    },
    {
      name: t("pricing.pro.title"),
      price: t("pricing.pro.price"),
      description: t("pricing.subtitle"),
      features: [
        t("pricing.pro.feature1"),
        t("pricing.pro.feature2"),
        t("pricing.pro.feature3"),
        t("pricing.pro.feature4"),
        t("pricing.pro.feature5"),
      ],
      cta: t("pricing.pro.cta"),
    },
  ];

  const comparison: ComparisonRow[] = [
    { feature: t("setups.setupOfTheDay"), free: t("setups.freeSetups"), premium: "Alle", pro: "Alle" },
    { feature: "Historie", free: "-", premium: "7–30 Tage", pro: "60–90 Tage" },
    { feature: "Alerts", free: "-", premium: "E-Mail", pro: "E-Mail + priorisiert" },
    { feature: "Trading-Journal", free: "-", premium: "Favoriten & Notes", pro: "Erweitert" },
    { feature: "Backtesting-Module", free: "-", premium: "Standard", pro: "Erweitert" },
    { feature: "API-Zugriff", free: "-", premium: "-", pro: "✓" },
  ];

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("pricing.title")}</h1>
          <p className="max-w-3xl text-sm text-[var(--text-secondary)] sm:text-base">{t("pricing.subtitle")}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md ${
                plan.highlighted ? "ring-1 ring-[rgba(34,197,94,0.25)] shadow-lg" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {plan.badge ? (
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {plan.badge}
                  </span>
                ) : null}
              </div>
              <div>
                <div className="text-2xl font-bold">{plan.price}</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{plan.description}</p>
              </div>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-0.5 text-[var(--accent)]">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <button
                  type="button"
                  className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-[var(--accent)] text-black shadow-[0_10px_20px_rgba(34,197,94,0.25)] hover:opacity-90"
                      : "border border-[var(--border-subtle)] bg-[var(--bg-main)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md">
          <h3 className="text-lg font-semibold">{t("pricing.comparison.title")}</h3>
          <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
            <div className="grid grid-cols-4 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <span>Feature</span>
              <span>Free</span>
              <span>Premium</span>
              <span>Pro</span>
            </div>
            {comparison.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-4 items-center gap-2 rounded-xl bg-[var(--bg-main)] px-3 py-2 text-sm"
              >
                <span className="font-medium text-[var(--text-primary)]">{row.feature}</span>
                <span>{row.free}</span>
                <span>{row.premium}</span>
                <span>{row.pro}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {locale === "de" ? "Vor dem Upgrade kannst du Folgendes pruefen:" : "Before upgrading, you can review:"}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
            <Link href={`${localePrefix}/how-it-works`} className="hover:text-[var(--text-primary)] hover:underline">
              {locale === "de" ? "So funktioniert das Framework ->" : "How the framework works ->"}
            </Link>
            <Link href={`${localePrefix}/data-sources`} className="hover:text-[var(--text-primary)] hover:underline">
              {locale === "de" ? "Daten & Abdeckung ->" : "Data & coverage transparency ->"}
            </Link>
            <Link href={`${localePrefix}/changelog`} className="hover:text-[var(--text-primary)] hover:underline">
              {locale === "de" ? "Engine-Changelog ->" : "Engine changelog ->"}
            </Link>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md">
          <h3 className="text-lg font-semibold">{t("pricing.apiInfo.title")}</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("pricing.apiInfo.text")}</p>
          <Link
            href="/docs/api"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] underline decoration-[var(--accent)] underline-offset-4 hover:brightness-110"
          >
            Mehr in den Docs
          </Link>
        </section>
      </div>
    </div>
  );
}


