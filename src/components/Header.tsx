"use client";

import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { MobileMenu } from "./MobileMenu";
import { i18nConfig, type Locale } from "../lib/i18n/config";
import { useT } from "../lib/i18n/ClientProvider";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";

type NavItem = {
  href: string;
  label: string;
  locked?: boolean;
};

function buildLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

export function Header(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();
  const plan = useUserPlanClient();
  const isPro = plan === "pro";

  const localePrefix = useMemo(() => buildLocalePrefix(pathname), [pathname]);

  const navItems: NavItem[] = [
    { href: `${localePrefix}/setups`, label: t("nav.setups") },
    { href: `${localePrefix}/ai-tools`, label: t("nav.kiTools"), locked: !isPro },
    { href: `${localePrefix}/backtesting`, label: t("nav.backtesting"), locked: !isPro },
    { href: `${localePrefix}/docs`, label: t("nav.docs"), locked: !isPro },
    { href: `${localePrefix}/pricing`, label: t("nav.pricing") },
  ];

  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link href={`${localePrefix}/`} className="text-sm font-extrabold tracking-tight text-[var(--text-primary)]">
            TradingAI
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-9 items-center rounded-md px-3 transition hover:bg-[var(--bg-main)] ${
                  item.locked
                    ? "text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
                    : "text-[var(--text-primary)] hover:text-[var(--text-primary)]"
                }`}
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
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <SignedOut>
            <Link
              href={`${localePrefix}/sign-in`}
              className="hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)] md:inline-flex"
            >
              Login
            </Link>
            <Link
              href={`${localePrefix}/sign-up`}
              className="hidden rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-black transition hover:opacity-90 md:inline-flex"
            >
              Sign up
            </Link>
          </SignedOut>
          <SignedIn>
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Plan: {plan}</span>
              <UserButton afterSignOutUrl={`${localePrefix}/`} />
            </div>
          </SignedIn>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] md:hidden"
            aria-label="Menue oeffnen"
            onClick={() => setMobileOpen(true)}
          >
            <span className="sr-only">Menue</span>
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-5 bg-[var(--text-primary)]" />
              <span className="block h-0.5 w-5 bg-[var(--text-primary)]" />
              <span className="block h-0.5 w-5 bg-[var(--text-primary)]" />
            </span>
          </button>
        </div>
      </div>
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
