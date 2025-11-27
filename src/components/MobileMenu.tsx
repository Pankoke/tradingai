"use client";

import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { i18nConfig, type Locale } from "../lib/i18n/config";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

type Plan = "free" | "premium" | "pro";

function buildLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

export function MobileMenu({ open, onClose }: MobileMenuProps): JSX.Element | null {
  const pathname = usePathname();
  const localePrefix = buildLocalePrefix(pathname);
  const plan = useUserPlanClient() as Plan | null;

  const isPro = plan === "pro";
  const isFree = plan === null || plan === "free";

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden">
      <div className="absolute inset-y-0 right-0 w-full max-w-xs bg-[#050509] text-[var(--text-primary)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            TradingAI Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)]"
            aria-label="Menü schließen"
          >
            ✕
          </button>
        </div>

        <nav className="h-[calc(100vh-48px)] overflow-y-auto px-4 py-4 text-sm">
          {/* Products */}
          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]">
              <span>Products</span>
              <span className="text-xs text-[var(--text-secondary)] group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <div className="mt-1 space-y-4 border-l border-[var(--border-subtle)]/60 pl-3">
              {/* Setups & Perception */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Setups &amp; Perception
                </p>
                <ul className="mt-1 space-y-1">
                  <li>
                    <Link
                      href={`${localePrefix}/setups`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="text-xs font-medium">Free Setups</div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Setup des Tages und freie Setups.
                      </p>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${localePrefix}/setups/premium`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">Premium Setups</span>
                        {isFree ? (
                          <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[0.6rem] font-semibold text-[var(--accent)]">
                            Premium
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Alle täglichen Setups für aktive Trader.
                      </p>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${localePrefix}/premium/perception`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="text-xs font-medium">Perception Engine Status</div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Snapshot, Version und Universe im Überblick.
                      </p>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* AI Tools & Backtesting */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  AI Tools &amp; Backtesting
                </p>
                <ul className="mt-1 space-y-1">
                  <li>
                    <Link
                      href={`${localePrefix}/ai-tools`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">AI Tools</span>
                        {!isPro ? (
                          <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[0.6rem] font-semibold text-[var(--accent)]">
                            Pro
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Event-Interpretation, Marktanalysen, Risiko.
                      </p>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${localePrefix}/backtesting`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">Backtesting</span>
                        {!isPro ? (
                          <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[0.6rem] font-semibold text-[var(--accent)]">
                            Pro
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Geplante Event-Replays und KI-Backtests.
                      </p>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${localePrefix}/docs`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">Docs</span>
                        {!isPro ? (
                          <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[0.6rem] font-semibold text-[var(--accent)]">
                            Pro
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        API &amp; Integrationen für Pro-User.
                      </p>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </details>

          {/* Resources */}
          <details className="group mt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]">
              <span>Resources</span>
              <span className="text-xs text-[var(--text-secondary)] group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <div className="mt-1 space-y-4 border-l border-[var(--border-subtle)]/60 pl-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Getting started
                </p>
                <ul className="mt-1 space-y-1">
                  <li>
                    <Link
                      href={`${localePrefix}/how-it-works`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="text-xs font-medium">How it works</div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Wie das Perception Lab Setups erzeugt.
                      </p>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${localePrefix}/how-it-works/perception`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="text-xs font-medium">Perception Lab Deep Dive</div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Details zu Modulen, Scores und Ranking.
                      </p>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${localePrefix}/pricing`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="text-xs font-medium">Free vs. Premium vs. Pro</div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Feature-Vergleich der Pläne.
                      </p>
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Market context
                </p>
                <ul className="mt-1 space-y-1">
                  <li>
                    <Link
                      href={`${localePrefix}/events`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="text-xs font-medium">Events</div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Heutige High-Impact-Events im Überblick.
                      </p>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${localePrefix}/bias`}
                      className="block rounded-md px-2 py-1.5 text-[var(--text-primary)] hover:bg-white/5"
                      onClick={onClose}
                    >
                      <div className="text-xs font-medium">Bias</div>
                      <p className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)]">
                        Markt-Bias je Asset &amp; Timeframe.
                      </p>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </details>

          {/* Simple Links */}
          <div className="mt-6 space-y-1 border-t border-[var(--border-subtle)]/60 pt-4">
            <Link
              href={`${localePrefix}/pricing`}
              className="block rounded-md px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              onClick={onClose}
            >
              Pricing
            </Link>
            <Link
              href={`${localePrefix}/contact`}
              className="block rounded-md px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              onClick={onClose}
            >
              Contact
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
