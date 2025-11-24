"use client";

import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

export function Header(): JSX.Element {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold tracking-tight">
            TradingAI
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-[var(--text-secondary)] md:flex">
            <Link href="/" className="hover:text-[var(--text-primary)]">
              Home
            </Link>
            <NavDropdown
              label="Setups"
              items={[
                { href: "/setups", label: "Setup of the Day" },
                { href: "/setups/premium", label: "Premium Setups" },
                { href: "/perception", label: "Perception Lab" },
              ]}
            />
            <NavDropdown
              label="Backtesting"
              items={[
                { href: "/backtesting/event", label: "Event-Backtester" },
                { href: "/backtesting/history", label: "Setup-Historie" },
                { href: "/backtesting/replay", label: "Replay-Modus" },
                { href: "/backtesting/ai", label: "KI-Backtesting" },
              ]}
            />
            <NavDropdown
              label="KI-Tools"
              items={[
                { href: "/ai-tools/setup-generator", label: "Setup Generator" },
                { href: "/ai-tools/market-summary", label: "Market Summary AI" },
                { href: "/ai-tools/event-interpreter", label: "Event Interpreter" },
                { href: "/ai-tools/risk-manager", label: "Risk Manager" },
                { href: "/ai-tools/screenshot-analysis", label: "Screenshot-Analyse" },
              ]}
            />
            <Link href="/pricing" className="hover:text-[var(--text-primary)]">
              Pricing
            </Link>
            <NavDropdown
              label="Docs"
              items={[
                { href: "/docs", label: "Übersicht" },
                { href: "/docs/api", label: "API" },
                { href: "/docs/webhooks", label: "Webhooks" },
                { href: "/docs/sdks", label: "SDKs" },
                { href: "/docs/examples", label: "Beispiele" },
              ]}
            />
            <NavDropdown
              label="Account"
              items={[
                { href: "/account/profile", label: "Profil" },
                { href: "/account/api-keys", label: "API Keys" },
                { href: "/account/billing", label: "Billing" },
                { href: "/account/alerts", label: "Alerts" },
                { href: "/account/saved-setups", label: "Saved Setups" },
              ]}
            />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

type NavItem = {
  href: string;
  label: string;
};

type NavDropdownProps = {
  label: string;
  items: NavItem[];
};

function NavDropdown({ label, items }: NavDropdownProps): JSX.Element {
  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
      >
        {label}
        <span className="text-[10px]">▼</span>
      </button>
      <div className="invisible absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
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
