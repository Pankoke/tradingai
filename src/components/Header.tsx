"use client";

import Image from "next/image";
import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
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

  const pathWithoutQuery = pathname.split("?")[0];
  const sectionPath = pathWithoutQuery.startsWith(localePrefix)
    ? pathWithoutQuery.slice(localePrefix.length) || "/"
    : pathWithoutQuery;

  const isProductsSection =
    sectionPath.startsWith("/setups") ||
    sectionPath.startsWith("/setup-v2") ||
    sectionPath.startsWith("/premium") ||
    sectionPath.startsWith("/ai-tools") ||
    sectionPath.startsWith("/backtesting") ||
    sectionPath.startsWith("/docs");

  const isResourcesSection =
    sectionPath.startsWith("/how-it-works") ||
    sectionPath.startsWith("/data-sources") ||
    sectionPath.startsWith("/changelog") ||
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
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
        {/* LEFT: Logo + Brand */}
        <div className="flex items-center gap-3">
          <Link
            href={`${localePrefix}/`}
            className="group flex items-center gap-2 text-lg font-extrabold tracking-tight text-[var(--text-primary)]"
            onClick={closeMenus}
          >
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[var(--accent)]/0 opacity-0 blur-xl transition-all duration-200 group-hover:bg-[var(--accent)]/10 group-hover:opacity-100" />
              <Image
                src="/logo-header.png"
                alt="TradingAI Logo"
                width={32}
                height={32}
                className="relative h-8 w-8 rounded-full ring-0 ring-[var(--accent)]/0 shadow-none transition-all duration-200 group-hover:scale-[1.03] group-hover:ring group-hover:ring-[var(--accent)]/40 group-hover:shadow-[0_0_14px_rgba(170,190,178,0.45)]"
                priority
              />
            </div>
            <span className="relative inline-flex items-center">
              {/* Normalzustand: AI richtig weiß */}
              <span className="transition-opacity duration-200 group-hover:opacity-0">
                Trading <span className="text-white">AI</span>
              </span>
              {/* Hover: sehr dezenter grau-grüner Gradient */}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#c4c9c6] via-[#d5ddd8] to-[#c4c9c6] bg-clip-text text-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Trading AI
              </span>
            </span>
          </Link>
        </div>

        {/* CENTER: Navigation (zentriert) */}
        <nav className="hidden flex-1 items-center justify-center gap-2 text-sm md:flex">
          {/* Products */}
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
                  {/* Column 1 */}
                  <div>
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
                          href={`${localePrefix}/setup-v2`}
                          className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                          onClick={closeMenus}
                        >
                          <div className="font-medium">Setup View V2</div>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Alternative Setup-Ansicht fuer A/B-Vergleich.
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

                  {/* Column 2 */}
                  <div>
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

          {/* Resources */}
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
                  <div>
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
                          href={`${localePrefix}/data-sources`}
                          className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                          onClick={closeMenus}
                        >
                          <div className="font-medium">Data & Coverage</div>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Transparent view of source layers and coverage limits.
                          </p>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href={`${localePrefix}/changelog`}
                          className="block rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-white/5"
                          onClick={closeMenus}
                        >
                          <div className="font-medium">Changelog</div>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Public updates on engine versions and revisions.
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
                  <div>
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

        {/* RIGHT: Language + Auth + Mobile */}
        <div className="ml-auto flex items-center gap-3">
          <LanguageToggle />

          <SignedOut>
            <Link
              href={`${localePrefix}/sign-in`}
              className="hidden rounded-full border border-[var(--border-subtle)] bg-white/10 px-4 py-1.5 text-sm font-semibold text-white shadow-sm md:inline-flex hover:bg-white/16"
              onClick={closeMenus}
            >
              Log in
            </Link>
            <Link
              href={`${localePrefix}/sign-up`}
              className="hidden rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black shadow-sm md:inline-flex hover:bg-white/90"
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

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}

