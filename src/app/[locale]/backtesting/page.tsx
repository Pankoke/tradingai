"use client";

import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProNotice } from "@/src/components/common/ProNotice";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";
import { AppShell } from "@/src/components/layout/AppShell";

function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return maybeLocale as Locale;
  }
  return i18nConfig.defaultLocale;
}

export default function BacktestingOverviewPage(): JSX.Element {
  const t = useT();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname || `/${i18nConfig.defaultLocale}`);
  const localePrefix = `/${locale}`;
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  const links = [{ href: `${localePrefix}/backtesting/event`, key: "links.event" }];

  return (
    <AppShell section="backtesting">
      <div className="space-y-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("backtesting.overview.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("backtesting.overview.subtitle")}</p>
        </header>

        <ProNotice context="backtesting" />

        {!isPro ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 text-sm text-[var(--text-secondary)] shadow-sm">
            {t("proNotice.text.backtesting")}
          </div>
        ) : (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("backtesting.overview.sections.title")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {links.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm transition hover:-translate-y-[1px]"
                >
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{t(`backtesting.overview.${link.key}`)}</div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{t(`backtesting.overview.${link.key}Desc`)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
