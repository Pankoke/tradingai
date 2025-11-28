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

  const baseBtn =
    "rounded-full px-3 py-1 font-semibold text-[11px] transition-colors";
  const active =
    "bg-white text-black shadow-sm";
  const inactive =
    "text-[var(--text-secondary)] hover:bg-white/5";

  return (
    <div className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)]/80 px-1 text-xs shadow-sm">
      <button
        type="button"
        onClick={() => switchLocale("de")}
        className={`${baseBtn} ${current === "de" ? active : inactive}`}
        aria-pressed={current === "de"}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => switchLocale("en")}
        className={`${baseBtn} ${current === "en" ? active : inactive}`}
        aria-pressed={current === "en"}
      >
        EN
      </button>
    </div>
  );
}
