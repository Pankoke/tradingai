"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { i18nConfig, type Locale } from "../lib/i18n/config";
import { useT } from "../lib/i18n/ClientProvider";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";

type NavItem = {
  label: string;
  href: string;
  locked?: boolean;
};

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

function buildLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

export function MobileMenu({ open, onClose }: MobileMenuProps): JSX.Element {
  const pathname = usePathname();
  const localePrefix = useMemo(() => buildLocalePrefix(pathname), [pathname]);
  const t = useT();
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  const navItems: NavItem[] = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.setups"), href: "/setups" },
    { label: t("nav.kiTools"), href: "/ai-tools", locked: !isPro },
    { label: t("nav.backtesting"), href: "/backtesting", locked: !isPro },
    { label: t("nav.docs"), href: "/docs", locked: !isPro },
    { label: t("nav.pricing"), href: "/pricing" },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        } md:hidden`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-4/5 max-w-xs transform bg-[var(--bg-surface)] shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        } md:hidden`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-base font-semibold text-[var(--text-primary)]">TradingAI</span>
          <button
            type="button"
            className="rounded-md border border-[var(--border-subtle)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            aria-label="Menue schliessen"
          >
            Close
          </button>
        </div>
        <div className="h-[1px] bg-[var(--border-subtle)]" />
        <nav className="flex flex-col gap-1 px-4 py-4 text-sm text-[var(--text-secondary)]">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={`${localePrefix}${item.href}`}
              className={`rounded-lg px-3 py-2 hover:bg-[var(--bg-main)] ${
                item.locked ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"
              }`}
              onClick={onClose}
            >
              <span className="inline-flex items-center gap-1">
                <span>{item.label}</span>
                {item.locked ? (
                  <span aria-hidden="true" className="text-xs">
                    {"\u{1f512}"}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
