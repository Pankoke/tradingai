"use client";

import React from "react";
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
  const prefix = localePrefix(pathname);

  // "© {year} TradingAI ..." -> {year} durch aktuelles Jahr ersetzen
  const footerCopy = t("footer.copy").replace("{year}", String(year));

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-xs text-[var(--text-subtle)] md:text-sm">
          <p>{footerCopy}</p>
          <p className="text-[var(--text-subtle)]">{t("footer.risk")}</p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs md:text-sm">
          <a
            href={`${prefix}/legal/imprint`}
            className="hover:text-[var(--text-primary)]"
          >
            {t("footer.disclaimer")}
          </a>
          <a
            href={`${prefix}/legal/privacy`}
            className="hover:text-[var(--text-primary)]"
          >
            {t("footer.privacy")}
          </a>
          <a
            href={`${prefix}/legal/terms`}
            className="hover:text-[var(--text-primary)]"
          >
            {t("footer.terms")}
          </a>
        </div>
      </div>
    </footer>
  );
}
