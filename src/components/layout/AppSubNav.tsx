"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";

export type AppSection = "overview" | "setups" | "aiTools" | "backtesting" | "docs";

type AppSubNavProps = {
  activeSection: AppSection;
};

type NavItem = {
  section: AppSection;
  href: string;
  i18nKey: string;
  proOnly?: boolean;
};

function buildLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (maybeLocale && i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

function isPathActive(pathname: string, href: string): boolean {
  // Exact match or nested path (e.g., /en/docs matches /en/docs/api)
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSubNav({ activeSection }: AppSubNavProps): JSX.Element {
  const t = useT();
  const pathname = usePathname();
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  const localePrefix = useMemo(() => buildLocalePrefix(pathname), [pathname]);

  const items: NavItem[] = [
    { section: "overview", href: `${localePrefix}/overview`, i18nKey: "appNav.overview" },
    { section: "setups", href: `${localePrefix}/setups`, i18nKey: "appNav.setups" },
    { section: "aiTools", href: `${localePrefix}/ai-tools`, i18nKey: "appNav.aiTools", proOnly: true },
    { section: "backtesting", href: `${localePrefix}/backtesting`, i18nKey: "appNav.backtesting", proOnly: true },
    { section: "docs", href: `${localePrefix}/docs`, i18nKey: "appNav.docs", proOnly: true },
  ];

  return (
    <div className="sticky top-14 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        {/* Left side: TradingAI Lab + Plan badge */}
        <div className="flex shrink-0 items-center gap-3 py-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">TradingAI Lab</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2 py-0.5 text-xs font-semibold">
            <span className="text-[var(--text-secondary)]">{t("appNav.planLabel") ?? "Plan"}</span>
            <span className="uppercase text-[var(--text-primary)]">{plan}</span>
          </span>
        </div>

        {/* Right side: Tabs - horizontal scrollable on mobile */}
        <nav className="flex items-center overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1">
            {items.map((item) => {
              const isActive = item.section === activeSection || isPathActive(pathname, item.href);
              const locked = item.proOnly && !isPro;
              return (
                <Link
                  key={item.section}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>{t(item.i18nKey)}</span>
                  {locked ? (
                    <span aria-hidden="true" className="text-xs">
                      {"\u{1f512}"}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
