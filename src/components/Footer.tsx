"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import { usePathname } from "next/navigation";
import { useT } from "../lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "../lib/i18n/config";

function localePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

export function Footer(): JSX.Element {
  const year = new Date().getFullYear();
  const t = useT();
  const pathname = usePathname();
  const prefix = useMemo(() => localePrefix(pathname), [pathname]);

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-[var(--text-secondary)] md:flex-row md:items-center md:justify-between">
        <div>{t("footer.copy").replace("{year}", String(year))}</div>
        <div className="flex flex-wrap gap-3">
          <span className="cursor-default">{t("footer.risk")}</span>
          <a href={`${prefix}/disclaimer`} className="hover:text-[var(--text-primary)]">
            {t("footer.disclaimer")}
          </a>
          <a href={`${prefix}/privacy`} className="hover:text-[var(--text-primary)]">
            {t("footer.privacy")}
          </a>
          <a href={`${prefix}/about`} className="hover:text-[var(--text-primary)]">
            {t("footer.about")}
          </a>
        </div>
      </div>
    </footer>
  );
}
