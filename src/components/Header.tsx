"use client";

import React, { useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { MobileMenu } from "./MobileMenu";
import { i18nConfig, type Locale } from "../lib/i18n/config";
import { useT } from "../lib/i18n/ClientProvider";

type NavItem = {
  href: string;
  label: string;
};

type NavDropdownProps = {
  label: string;
  items: NavItem[];
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

  const localePrefix = useMemo(() => buildLocalePrefix(pathname), [pathname]);

  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-5">
          <Link href={`${localePrefix}/`} className="text-sm font-extrabold tracking-tight text-[var(--text-primary)]">
            TradingAI
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-[var(--text-secondary)] md:flex">
            <Link
              href={`${localePrefix}/`}
              className="inline-flex h-9 items-center rounded-md px-3 transition hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
            >
              {t("nav.home")}
            </Link>
            <NavDropdown
              label={t("nav.setups")}
              items={[
                { href: `${localePrefix}/setups`, label: "Setup of the Day" },
                { href: `${localePrefix}/setups/premium`, label: "Premium Setups" },
                { href: `${localePrefix}/perception`, label: "Perception Lab" },
              ]}
            />
            <NavDropdown
              label={t("nav.backtesting")}
              items={[
                { href: `${localePrefix}/backtesting/event`, label: "Event-Backtester" },
                { href: `${localePrefix}/backtesting/history`, label: "Setup-Historie" },
                { href: `${localePrefix}/backtesting/replay`, label: "Replay-Modus" },
                { href: `${localePrefix}/backtesting/ai`, label: "KI-Backtesting" },
              ]}
            />
            <NavDropdown
              label={t("nav.kiTools")}
              items={[
                { href: `${localePrefix}/ai-tools`, label: t("nav.kiTools") },
                { href: `${localePrefix}/ai-tools/setup-generator`, label: "Setup Generator" },
                { href: `${localePrefix}/ai-tools/market-summary`, label: "Market Summary AI" },
                { href: `${localePrefix}/ai-tools/event-interpreter`, label: "Event Interpreter" },
                { href: `${localePrefix}/ai-tools/risk-manager`, label: "Risk Manager" },
                { href: `${localePrefix}/ai-tools/screenshot-analysis`, label: "Screenshot-Analyse" },
              ]}
            />
            <Link
              href={`${localePrefix}/pricing`}
              className="inline-flex h-9 items-center rounded-md px-3 transition hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
            >
              {t("nav.pricing")}
            </Link>
            <NavDropdown
              label={t("nav.docs")}
              items={[
                { href: `${localePrefix}/docs`, label: t("docs.overview.title") },
                { href: `${localePrefix}/docs/api`, label: "API" },
                { href: `${localePrefix}/docs/webhooks`, label: "Webhooks" },
                { href: `${localePrefix}/docs/sdks`, label: "SDKs" },
                { href: `${localePrefix}/docs/examples`, label: "Beispiele" },
              ]}
            />
            <NavDropdown
              label={t("nav.account")}
              items={[
                { href: `${localePrefix}/account/profile`, label: "Profil" },
                { href: `${localePrefix}/account/api-keys`, label: "API Keys" },
                { href: `${localePrefix}/account/billing`, label: "Billing" },
                { href: `${localePrefix}/account/alerts`, label: "Alerts" },
                { href: `${localePrefix}/account/saved-setups`, label: "Saved Setups" },
              ]}
            />
            <Link
              href={`${localePrefix}/events`}
              className="inline-flex h-9 items-center rounded-md px-3 transition hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
            >
              {t("nav.events")}
            </Link>
            <Link
              href={`${localePrefix}/bias`}
              className="inline-flex h-9 items-center rounded-md px-3 transition hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
            >
              {t("nav.bias")}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
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

function NavDropdown({ label, items }: NavDropdownProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const clearTimer = (): void => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const handleEnter = (): void => {
    clearTimer();
    setOpen(true);
  };

  const handleLeave = (): void => {
    clearTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  const handleBlur = (): void => {
    handleLeave();
  };

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave} onFocus={handleEnter} onBlur={handleBlur}>
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-[var(--text-secondary)] transition hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
        <span className="text-[10px]" aria-hidden="true">
          ▾
        </span>
      </button>
      <div
        className={`absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-lg transition ${
          open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1"
        }`}
      >
        <div className="flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[var(--text-secondary)] transition hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
