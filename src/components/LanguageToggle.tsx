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
    <div className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-600 bg-slate-900 px-2 text-xs shadow-sm">
      <button
        type="button"
        onClick={() => switchLocale("de")}
        className={`rounded-full px-3 py-1 font-semibold ${
          current === "de"
            ? "bg-slate-100 text-slate-900"
            : "text-slate-200 hover:bg-slate-800"
        }`}
        aria-pressed={current === "de"}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => switchLocale("en")}
        className={`rounded-full px-3 py-1 font-semibold ${
          current === "en"
            ? "bg-slate-100 text-slate-900"
            : "text-slate-200 hover:bg-slate-800"
        }`}
        aria-pressed={current === "en"}
      >
        EN
      </button>
    </div>
  );
}
