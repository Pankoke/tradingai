"use client";

import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { i18nConfig, type Locale } from "../lib/i18n/config";
import { useT } from "../lib/i18n/ClientProvider";

type NavItem = {
  label: string;
  href?: string;
  children?: NavItem[];
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const localePrefix = useMemo(() => buildLocalePrefix(pathname), [pathname]);
  const t = useT();

  const navItems: NavItem[] = [
    { label: t("nav.home"), href: "/" },
    {
      label: t("nav.setups"),
      children: [
        { label: "Setup of the Day", href: "/setups" },
        { label: "Premium Setups", href: "/setups/premium" },
        { label: "Perception Lab", href: "/perception" },
      ],
    },
    {
      label: t("nav.backtesting"),
      children: [
        { label: "Event-Backtester", href: "/backtesting/event" },
        { label: "Setup-Historie", href: "/backtesting/history" },
        { label: "Replay-Modus", href: "/backtesting/replay" },
        { label: "KI-Backtesting", href: "/backtesting/ai" },
      ],
    },
    {
      label: t("nav.kiTools"),
      children: [
        { label: "Setup Generator", href: "/ai-tools/setup-generator" },
        { label: "Market Summary AI", href: "/ai-tools/market-summary" },
        { label: "Event Interpreter", href: "/ai-tools/event-interpreter" },
        { label: "Risk Manager", href: "/ai-tools/risk-manager" },
        { label: "Screenshot-Analyse", href: "/ai-tools/screenshot-analysis" },
      ],
    },
    { label: t("nav.pricing"), href: "/pricing" },
    {
      label: t("nav.docs"),
      children: [
        { label: t("docs.overview.title"), href: "/docs" },
        { label: "API", href: "/docs/api" },
        { label: "Webhooks", href: "/docs/webhooks" },
        { label: "SDKs", href: "/docs/sdks" },
        { label: "Beispiele", href: "/docs/examples" },
      ],
    },
    {
      label: t("nav.account"),
      children: [
        { label: "Profil", href: "/account/profile" },
        { label: "API Keys", href: "/account/api-keys" },
        { label: "Billing", href: "/account/billing" },
        { label: "Alerts", href: "/account/alerts" },
        { label: "Saved Setups", href: "/account/saved-setups" },
      ],
    },
  ];

  const toggleSection = (label: string): void => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "pointer-events-none opacity-0"
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
            aria-label="Menü schließen"
          >
            ✕
          </button>
        </div>
        <div className="h-[1px] bg-[var(--border-subtle)]" />
        <nav className="flex flex-col gap-1 px-4 py-4 text-sm text-[var(--text-secondary)]">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleSection(item.label)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
                >
                  <span>{item.label}</span>
                  <span
                    className={`text-xs transition-transform ${
                      openSections[item.label] ? "rotate-90" : ""
                    }`}
                  >
                    ›
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-[max-height,opacity] duration-200 ${
                    openSections[item.label] ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="flex flex-col gap-1 pb-2 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={`${localePrefix}${child.href ?? "#"}`}
                        className="rounded-lg px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
                        onClick={onClose}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={`${localePrefix}${item.href ?? "#"}`}
                className="rounded-lg px-3 py-2 hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
                onClick={onClose}
              >
                {item.label}
              </Link>
            )
          )}
        </nav>
      </aside>
    </>
  );
}
