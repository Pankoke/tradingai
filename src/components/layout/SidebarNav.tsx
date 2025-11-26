"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";

export type AppSection = "overview" | "setups" | "aiTools" | "backtesting" | "docs";

type SidebarNavProps = {
  activeSection: AppSection;
};

type SidebarItem = {
  section: AppSection;
  href: string;
  i18nKey: string;
  proOnly?: boolean;
};

function buildLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0] ? `/${segments[0]}` : "";
  return maybeLocale || "/";
}

export function SidebarNav({ activeSection }: SidebarNavProps): JSX.Element {
  const t = useT();
  const pathname = usePathname();
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  const localePrefix = useMemo(() => buildLocalePrefix(pathname), [pathname]);

  const items: SidebarItem[] = [
    { section: "overview", href: `${localePrefix}/overview`, i18nKey: "appNav.overview" },
    { section: "setups", href: `${localePrefix}/setups`, i18nKey: "appNav.setups" },
    { section: "aiTools", href: `${localePrefix}/ai-tools`, i18nKey: "appNav.aiTools", proOnly: true },
    { section: "backtesting", href: `${localePrefix}/backtesting`, i18nKey: "appNav.backtesting", proOnly: true },
    { section: "docs", href: `${localePrefix}/docs`, i18nKey: "appNav.docs", proOnly: true },
  ];

  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] md:block">
      <div className="flex flex-col gap-4 p-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-[var(--text-primary)]">TradingAI Lab</div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            <span>{t("appNav.planLabel") ?? "Plan"}</span>
            <span className="uppercase text-[var(--text-primary)]">{plan}</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = item.section === activeSection || pathname.startsWith(item.href);
            const locked = item.proOnly && !isPro;
            return (
              <Link
                key={item.section}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
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
        </nav>
      </div>
    </aside>
  );
}
