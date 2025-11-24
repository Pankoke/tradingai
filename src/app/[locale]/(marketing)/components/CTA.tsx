"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../../../../lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "../../../../lib/i18n/config";

const badgeKeys = ["cta.feature1", "cta.feature2", "cta.feature3", "cta.feature4"];

function localePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

export function CTA(): JSX.Element {
  const t = useT();
  const pathname = usePathname();
  const prefix = useMemo(() => localePrefix(pathname), [pathname]);

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.3)] ring-1 ring-[rgba(34,197,94,0.08)] sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("section.cta.title")}</h2>
        <p className="max-w-xl text-sm text-[var(--text-secondary)] sm:text-base">{t("section.cta.text")}</p>
        <div className="flex flex-wrap gap-2">
          {badgeKeys.map((badgeKey) => (
            <span
              key={badgeKey}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1 text-[0.75rem] text-[var(--accent)]"
            >
              {t(badgeKey)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
        <Link
          href={`${prefix}/pricing`}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-black shadow-[0_10px_20px_rgba(34,197,94,0.25)] transition hover:opacity-90"
        >
          {t("section.cta.button")}
        </Link>
      </div>
    </section>
  );
}
