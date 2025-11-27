"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { MobileMenu } from "./MobileMenu";
import { i18nConfig, type Locale } from "../lib/i18n/config";
import { useUserPlanClient } from "@/src/lib/auth/userPlanClient";

type Plan = "free" | "premium" | "pro";
type OpenMenu = "products" | "resources" | null;

function buildLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

function getPlanFlags(plan: Plan | null): {
  isFree: boolean;
  isPremium: boolean;
  isPro: boolean;
} {
  if (plan === "premium") {
    return { isFree: false, isPremium: true, isPro: false };
  }
  if (plan === "pro") {
    return { isFree: false, isPremium: false, isPro: true };
  }
  // treat null/unknown as free
  return { isFree: true, isPremium: false, isPro: false };
}

export function Header(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  const pathname = usePathname();
  const plan = useUserPlanClient() as Plan | null;

  const localePrefix = useMemo(() => buildLocalePrefix(pathname), [pathname]);
  const { isFree, isPro } = getPlanFlags(plan);
  const planLabel = plan ?? "free";

  // --------- Active-State Ermittlung ----------
  const pathWithoutQuery = pathname.split("?")[0];
  const sectionPath = pathWithoutQuery.startsWith(localePrefix)
    ? pathWithoutQuery.slice(localePrefix.length) || "/"
    : pathWithoutQuery;

  const isProductsSection =
    sectionPath.startsWith("/setups") ||
    sectionPath.startsWith("/premium") ||
    sectionPath.startsWith("/ai-tools") ||
    sectionPath.startsWith("/backtesting") ||
    sectionPath.startsWith("/docs");

  const isResourcesSection =
    sectionPath.startsWith("/how-it-works") ||
    sectionPath.startsWith("/events") ||
    sectionPath.startsWith("/bias");

  const isPricingSection = sectionPath === "/pricing";
  const isContactSection = sectionPath === "/contact";

  const productsActive = openMenu === "products" || isProductsSection;
  const resourcesActive = openMenu === "resources" || isResourcesSection;

  const navButtonBase =
    "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium border-b-2 border-transparent transition";
  const navButtonInactive =
    "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]";
  const navButtonActive =
    "text-[var(--text-primary)] border-[var(--accent)]";

  const toggleMenu = (menu: OpenMenu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const closeMenus = () => {
    setOpenMenu(null);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)]/60 bg-[#050509]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* LEFT: Logo + Desktop Navigation */}
        <div className="flex items-center gap-6">
          <Link
            href={`${localePrefix}/`}
            className="text-lg font-extrabold tracking-tight text-[var(--text-primary)]"
            onClick={closeMenus}
          >
            Trading AI
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-2 text-sm md:flex">
            {/* Products dropdown */}
            <div className="relative">
              <button
                type="button"
                className={`${navButtonBase} ${
                  productsActive ? navButtonActive : navButtonInactive
                }`}
                onClick={() => toggleMenu("products")}
              >
                <span>Products</span>
                <span className="ml-1 text-[10px]">▾</span>
              </button>

              {openMenu === "products" ? (
                <div className="absolute left-0 top-full mt-2 w-[540px] rounded-2xl border border-[var(--border-subtle)] bg-[#050509] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.85)] ring-1 ring-black/60">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Column 1: Setups & Perception */}
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        Setups &amp; Perception
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li>
                          <Link
                            href={`${localePrefix}/setups`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="font-medium">Free Setups</div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Setup des Tages und freie Setups als Vorschau.
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`${localePrefix}/setups/premium`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Premium Setups</span>
                              {isFree ? (
                                <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                                  Premium
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Alle täglichen Setups für aktive Trader.
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`${localePrefix}/premium/perception`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="font-medium">Perception Engine Status</div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Überblick über Snapshot, Version und Universe.
                            </p>
                          </Link>
                        </li>
                      </ul>
                    </div>

                    {/* Column 2: AI Tools & Backtesting */}
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        AI Tools &amp; Backtesting
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li>
                          <Link
                            href={`${localePrefix}/ai-tools`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-medium">AI Tools</span>
                              {!isPro ? (
                                <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                                  Pro
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              KI-Module für Event-Interpretation, Marktanalysen und Risiko.
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`${localePrefix}/backtesting`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Backtesting</span>
                              {!isPro ? (
                                <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                                  Pro
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Geplante Module für Event-Replays, Historie und KI-Backtests.
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`${localePrefix}/docs`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Docs</span>
                              {!isPro ? (
                                <span className="rounded-full bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                                  Pro
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              API &amp; Integrationsdokumentation für Pro-User.
                            </p>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Resources dropdown */}
            <div className="relative">
              <button
                type="button"
                className={`${navButtonBase} ${
                  resourcesActive ? navButtonActive : navButtonInactive
                }`}
                onClick={() => toggleMenu("resources")}
              >
                <span>Resources</span>
                <span className="ml-1 text-[10px]">▾</span>
              </button>

              {openMenu === "resources" ? (
                <div className="absolute left-0 top-full mt-2 w-[520px] rounded-2xl border border-[var(--border-subtle)] bg-[#050509] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.85)] ring-1 ring-black/60">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Column 1: Getting started */}
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        Getting started
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li>
                          <Link
                            href={`${localePrefix}/how-it-works`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="font-medium">How it works</div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Wie das Perception Lab Setups aus Regeln &amp; KI erzeugt.
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`${localePrefix}/how-it-works/perception`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="font-medium">Perception Lab Deep Dive</div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Detaillierte Erklärung der Analyse-Module und Scores.
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`${localePrefix}/pricing`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="font-medium">Free vs. Premium vs. Pro</div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Vergleiche Features, Setups und API-Zugriff.
                            </p>
                          </Link>
                        </li>
                      </ul>
                    </div>

                    {/* Column 2: Market context */}
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        Market context
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li>
                          <Link
                            href={`${localePrefix}/events`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="font-medium">Events</div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Heutige High-Impact-Events, die ins Ranking einfließen.
                            </p>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`${localePrefix}/bias`}
                            className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                            onClick={closeMenus}
                          >
                            <div className="font-medium">Bias</div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              Markt-Bias je Asset &amp; Timeframe im Überblick.
                            </p>
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Pricing */}
            <Link
              href={`${localePrefix}/pricing`}
              className={`${navButtonBase} ${
                isPricingSection ? navButtonActive : navButtonInactive
              }`}
              onClick={closeMenus}
            >
              Pricing
            </Link>

            {/* Contact */}
            <Link
              href={`${localePrefix}/contact`}
              className={`${navButtonBase} ${
                isContactSection ? navButtonActive : navButtonInactive
              }`}
              onClick={closeMenus}
            >
              Contact
            </Link>
          </nav>
        </div>

        {/* RIGHT: Toggles + Auth */}
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />

          <SignedOut>
            <Link
              href={`${localePrefix}/sign-in`}
              className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)]/70 px-4 py-1.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm md:inline-flex"
              onClick={closeMenus}
            >
              Log in
            </Link>
            <Link
              href={`${localePrefix}/sign-up`}
              className="hidden rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-black shadow-sm md:inline-flex"
              onClick={closeMenus}
            >
              Sign up
            </Link>
          </SignedOut>

          <SignedIn>
            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-full bg-[var(--bg-main)]/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                Plan {planLabel}
              </span>
            <UserButton afterSignOutUrl={`${localePrefix}/`} />
            </div>
          </SignedIn>

          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[#050509] px-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] md:hidden"
            aria-label="Menü öffnen"
            onClick={() => {
              closeMenus();
              setMobileOpen(true);
            }}
          >
            <span className="sr-only">Menü</span>
            <span className="flex flex-col gap-[3px]">
              <span className="block h-[2px] w-5 bg-[var(--text-primary)]" />
              <span className="block h-[2px] w-5 bg-[var(--text-primary)]" />
              <span className="block h-[2px] w-5 bg-[var(--text-primary)]" />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile full-screen menu */}
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
