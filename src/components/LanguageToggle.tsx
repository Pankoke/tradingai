"use client";

import React from "react";
import type { JSX } from "react";
import { usePathname, useRouter } from "next/navigation";
import { i18nConfig, type Locale } from "../lib/i18n/config";

function resolveLocale(pathname: string): { current: Locale; rest: string[] } {
  const segments = pathname.split("/").filter(Boolean);
  const [maybeLocale, ...rest] = segments;
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return { current: maybeLocale as Locale, rest };
  }
  return { current: i18nConfig.defaultLocale, rest: segments };
}

export function LanguageToggle(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { current, rest } = resolveLocale(pathname);

  const switchLocale = (locale: Locale): void => {
    if (locale === current) return;
    const newPath = `/${locale}${rest.length ? `/${rest.join("/")}` : ""}`;
    router.push(newPath);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] p-1 text-xs">
      <button
        type="button"
        onClick={() => switchLocale("de")}
        className={`rounded-full px-2 py-0.5 ${
          current === "de" ? "bg-[var(--accent-soft)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        }`}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => switchLocale("en")}
        className={`rounded-full px-2 py-0.5 ${
          current === "en" ? "bg-[var(--accent-soft)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        }`}
      >
        EN
      </button>
    </div>
  );
}
