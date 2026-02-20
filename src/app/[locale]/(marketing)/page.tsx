"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Activity, BarChart3, Shield, Zap, ActivitySquare } from "lucide-react";
import { fetchPerceptionToday } from "@/src/lib/api/perceptionClient";
import { fetchMarketingOverview, type MarketingOverviewResponse } from "@/src/lib/api/marketingOverviewClient";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { clamp } from "@/src/lib/math";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { SetupOfTheDayCard } from "@/src/app/[locale]/(marketing)/components/SetupOfTheDayCard";

type Labels = ReturnType<typeof buildLabels>;

function buildLabels(t: (key: string) => string) {
  return {
    directionLong: t("homepage.labels.directionLong"),
    directionShort: t("homepage.labels.directionShort"),
    confidence: t("homepage.labels.confidence"),
    entry: t("homepage.labels.entry"),
    stopLoss: t("homepage.labels.stop"),
    takeProfit: t("homepage.labels.take"),
    eventHigh: t("homepage.labels.eventHigh"),
    eventMedium: t("homepage.labels.eventMedium"),
    eventLow: t("homepage.labels.eventLow"),
    biasBullish: t("homepage.labels.biasBullish"),
    biasBearish: t("homepage.labels.biasBearish"),
    biasNeutral: t("homepage.labels.biasNeutral"),
    sentimentPositive: t("homepage.labels.sentimentPositive"),
    sentimentNegative: t("homepage.labels.sentimentNegative"),
    sentimentNeutral: t("homepage.labels.sentimentNeutral"),
    sourceRuleBased: t("homepage.labels.sourceRuleBased"),
    orderflowBuyers: t("homepage.labels.orderflowBuyers"),
    orderflowSellers: t("homepage.labels.orderflowSellers"),
    orderflowBalanced: t("homepage.labels.orderflowBalanced"),
    weakSetup: t("homepage.labels.weakSetup"),
    heroHeadline: t("homepage.hero.headline"),
    heroCta: t("homepage.hero.cta"),
    heroFallback: t("marketing.noSetupOfDay"),
    listHeadline: t("homepage.list.headline"),
    listEmpty: t("homepage.list.empty"),
  };
}

function parseEntryZone(value?: string | null): { from: number | null; to: number | null } {
  if (!value) {
    return { from: null, to: null };
  }
  const matches = value.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) {
    return { from: null, to: null };
  }
  if (matches.length === 1) {
    const num = parseFloat(matches[0]);
    const safe = Number.isFinite(num) ? num : null;
    return { from: safe, to: safe };
  }
  const nums = matches.map((m) => parseFloat(m));
  const first = Number.isFinite(nums[0]) ? nums[0] : null;
  const second = Number.isFinite(nums[1]) ? nums[1] : null;
  return { from: first, to: second };
}

function parseNumber(value?: string | null): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toHomepageSetup(setup: Setup): HomepageSetup {
  return {
    id: setup.id,
    assetId: setup.assetId,
    symbol: setup.symbol,
    timeframe: setup.timeframe,
    timeframeUsed: (setup as { timeframeUsed?: string | null }).timeframeUsed ?? setup.timeframe ?? null,
    setupGrade: setup.setupGrade,
    setupType: setup.setupType,
    gradeRationale: setup.gradeRationale,
    gradeDebugReason: setup.gradeDebugReason,
    noTradeReason: setup.noTradeReason,
    direction: setup.direction,
    confidence: clamp(setup.confidence, 0, 100),
    weakSignal: setup.confidence < 60,
    eventLevel:
      setup.eventScore >= 70
        ? "high"
        : setup.eventScore >= 40
        ? "medium"
        : "low",
    orderflowMode: "balanced",
    bias: {
      direction:
        setup.biasScore >= 55
          ? "Bullish"
          : setup.biasScore <= 45
          ? "Bearish"
          : "Neutral",
      strength: clamp(setup.biasScore, 0, 100),
    },
    sentimentScore: clamp((setup.sentimentScore - 50) / 50, -1, 1),
    entryZone: parseEntryZone(setup.entryZone),
    stopLoss: parseNumber(setup.stopLoss),
    takeProfit: parseNumber(setup.takeProfit),
    category: setup.category ?? null,
    levelDebug: setup.levelDebug,
    riskReward: setup.riskReward,
    snapshotTimestamp: new Date().toISOString(),
    snapshotId: setup.snapshotId ?? null,
    snapshotCreatedAt: setup.snapshotCreatedAt ?? new Date().toISOString(),
    rings: setup.rings,
    eventContext: setup.eventContext ?? null,
    ringAiSummary: setup.ringAiSummary ?? null,
    eventModifier: setup.eventModifier ?? null,
    sentiment: setup.sentiment ?? null,
    orderflow: setup.orderflow ?? null,
    profile: setup.profile ?? null,
    setupPlaybookId: (setup as { setupPlaybookId?: string | null }).setupPlaybookId ?? null,
    dataSourcePrimary: (setup as { dataSourcePrimary?: string | null }).dataSourcePrimary ?? null,
    dataSourceUsed: (setup as { dataSourceUsed?: string | null }).dataSourceUsed ?? null,
    providerSymbolUsed: (setup as { providerSymbolUsed?: string | null }).providerSymbolUsed ?? null,
    snapshotLabel: (setup as { snapshotLabel?: string | null }).snapshotLabel ?? null,
  };
}

export default function MarketingPage(): JSX.Element {
  const t = useT();
  const pathname = usePathname();
  const [overview, setOverview] = useState<MarketingOverviewResponse | null>(null);
  const [overviewState, setOverviewState] = useState<"loading" | "ready" | "error">("loading");
  const [setupOfTheDay, setSetupOfTheDay] =
    useState<HomepageSetup | null>(null);
  const [setupOfTheDayRaw, setSetupOfTheDayRaw] = useState<Setup | null>(null);
  const [snapshotTime, setSnapshotTime] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const locale = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const maybeLocale = segments[0];
    if (i18nConfig.locales.includes(maybeLocale as Locale)) {
      return maybeLocale as Locale;
    }
    return i18nConfig.defaultLocale;
  }, [pathname]);

  const labels: Labels = useMemo(() => buildLabels(t), [t]);

  useEffect(() => {
  const load = async (): Promise<void> => {
    try {
      const [overviewData, data] = await Promise.all([
        fetchMarketingOverview(),
        fetchPerceptionToday(),
      ]);

      setOverview(overviewData);
      setOverviewState("ready");

      const heroItem =
        data.items.find((item) => item.isSetupOfTheDay) ?? data.items[0] ?? null;
      const heroSetup =
        heroItem ? data.setups.find((setup) => setup.id === heroItem.setupId) : null;
      const winner = heroSetup ?? data.setups[0] ?? null;
      setSetupOfTheDay(winner ? toHomepageSetup(winner) : null);
      setSetupOfTheDayRaw(winner);
      setSnapshotTime(data.snapshot.snapshotTime);
      setState("ready");
    } catch (error) {
      console.error(error);
      setOverviewState("error");
      setState("error");
    }
  };
    void load();
  }, []);
  const todayHuman = new Date().toLocaleDateString(
    locale === "de" ? "de-DE" : "en-US",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  if (state === "loading") {
    return (
      <div className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground">
          {t("marketing.loading")}
        </div>
      </div>
    );
  }

  if (state === "error" || !setupOfTheDay) {
    return (
      <div className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground">
          {labels.heroFallback}
        </div>
      </div>
    );
  }

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        {/* HERO: Text + KPIs */}
        <header className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] md:items-start">
          <div className="space-y-3 text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl dark:text-white">
              {t("hero.title")}
            </h1>
            <p className="max-w-3xl text-sm text-[var(--text-secondary)] sm:text-base dark:text-slate-200">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
              <Link href={`/${locale}/how-it-works`} className="hover:text-[var(--text-primary)] hover:underline">
                {locale === "de" ? "So funktioniert das Framework ->" : "How the framework works ->"}
              </Link>
              <Link href={`/${locale}/data-sources`} className="hover:text-[var(--text-primary)] hover:underline">
                {locale === "de" ? "Daten & Abdeckung ->" : "Data & coverage transparency ->"}
              </Link>
              <Link href={`/${locale}/changelog`} className="hover:text-[var(--text-primary)] hover:underline">
                {locale === "de" ? "Engine-Changelog ->" : "Engine changelog ->"}
              </Link>
            </div>
            <a
              href="#perception-lab"
              className="text-sm font-semibold text-sky-600 underline underline-offset-4 dark:text-sky-400"
            >
              {t("hero.linkPerception")}
            </a>
          </div>

          <LiveOverviewPanel locale={locale} overview={overview} state={overviewState} />
        </header>

        {/* SETUP OF THE DAY */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
              {todayHuman}
            </span>
          </div>
          <div>
            {setupOfTheDayRaw ? (
              <SetupOfTheDayCard setup={setupOfTheDayRaw} generatedAt={snapshotTime ?? undefined} />
            ) : (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
                {labels.heroFallback}
              </div>
            )}
          </div>
        </section>

        {/* WHAT IS THE PERCEPTION LAB – mit exakt gleichem Card-Container */}
        <section>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-[1.5px] shadow-sm dark:border-transparent dark:from-sky-500/15 dark:via-transparent dark:to-emerald-500/10 dark:shadow-[0_0_25px_rgba(56,189,248,0.15)]">
            <div
              id="perception-lab"
              className="flex flex-col gap-6 rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_rgba(4,7,15,0.98)] px-5 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] md:px-8 md:py-8"
            >
              <div className="space-y-5 text-center">
                <h2 className="text-xl font-semibold text-white md:text-2xl">
                  {t("homepage.info.title")}
                </h2>
                <p className="text-sm leading-relaxed text-slate-200">
                  {t("homepage.info.p1")}
                </p>
                <p className="text-sm leading-relaxed text-slate-200">
                  {t("homepage.info.p2")}
                </p>
                <p className="text-sm leading-relaxed text-slate-200">
                  {t("homepage.info.p3")}
                </p>
              </div>

              <div className="mt-2 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  icon={<Zap className="h-6 w-6 text-sky-300" />}
                  title={t("homepage.info.cards.analysis.title")}
                  text={t("homepage.info.cards.analysis.body")}
                />
                <InfoCard
                  icon={<BarChart3 className="h-6 w-6 text-sky-300" />}
                  title={t("homepage.info.cards.multi.title")}
                  text={t("homepage.info.cards.multi.body")}
                />
                <InfoCard
                  icon={<ActivitySquare className="h-6 w-6 text-sky-300" />}
                  title={t("homepage.info.cards.clear.title")}
                  text={t("homepage.info.cards.clear.body")}
                />
                <InfoCard
                  icon={<Shield className="h-6 w-6 text-sky-300" />}
                  title={t("homepage.info.cards.consistent.title")}
                  text={t("homepage.info.cards.consistent.body")}
                />
              </div>
            </div>
          </div>
        </section>

        {/* UNLOCK MORE SETUPS – gleicher Card-Container wie oben & wie Setup des Tages */}
        <section>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-[1.5px] shadow-sm dark:border-transparent dark:from-sky-500/15 dark:via-transparent dark:to-emerald-500/10 dark:shadow-[0_0_25px_rgba(56,189,248,0.15)]">
            <div className="flex flex-col gap-6 rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_rgba(4,7,15,0.98)] px-5 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.85)] md:px-8 md:py-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white md:text-xl">
                    {t("homepage.cta.title")}
                  </h3>
                  <p className="text-sm text-slate-200">
                    {t("homepage.cta.subtitle")}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-emerald-300">
                    <BadgeDot label={t("homepage.cta.badges.all")} />
                    <BadgeDot label={t("homepage.cta.badges.ai")} />
                    <BadgeDot label={t("homepage.cta.badges.multi")} />
                    <BadgeDot label={t("homepage.cta.badges.alerts")} />
                  </div>
                </div>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.3)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t("homepage.cta.button")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

// -----------------------------------------------------------------------------
// Kleinkomponenten
// -----------------------------------------------------------------------------

function formatAsOf(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  const formatted = parsed.toLocaleString(locale === "de" ? "de-DE" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${formatted} UTC`;
}

function LiveOverviewPanel({
  locale,
  overview,
  state,
}: {
  locale: Locale;
  overview: MarketingOverviewResponse | null;
  state: "loading" | "ready" | "error";
}): JSX.Element {
  const labels = {
    title: locale === "de" ? "Perception Lab — Systemstatus" : "Perception Lab — System Status",
    status: locale === "de" ? "Betrieb aktiv" : "Operational",
    badge1: locale === "de" ? "Snapshot-basiert" : "Snapshot-based",
    badge2: locale === "de" ? "Playbook-gesteuert" : "Playbook-driven",
    badge3: locale === "de" ? "Fallback-aware" : "Fallback-aware",
    assets: locale === "de" ? "Assets im Universe" : "Assets tracked",
    active: locale === "de" ? "Aktive Setups" : "Active setups",
    emptyActive:
      locale === "de"
        ? "Keine qualifizierten Setups im letzten Snapshot"
        : "No qualifying setups in the latest snapshot",
    footer:
      locale === "de"
        ? `Engine ${overview?.engineVersion ?? "unknown"} · Stand ${formatAsOf(overview?.latestSnapshotTime, locale)}`
        : `Engine ${overview?.engineVersion ?? "unknown"} · As of ${formatAsOf(overview?.latestSnapshotTime, locale)}`,
  };

  return (
    <div className="group w-full max-w-xl self-start rounded-2xl border border-slate-600/60 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_55%),_radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.1),_transparent_45%),_rgba(4,7,15,0.96)] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.45)] transition-shadow duration-200 hover:shadow-[0_20px_56px_rgba(0,0,0,0.58)] md:mt-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold tracking-[0.01em] text-white">{labels.title}</p>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
            {labels.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-slate-500/50 bg-slate-800/75 px-2 py-0.5 text-[10px] text-slate-300">
            {labels.badge1}
          </span>
          <span className="rounded-full border border-slate-500/50 bg-slate-800/75 px-2 py-0.5 text-[10px] text-slate-300">
            {labels.badge2}
          </span>
          <span className="rounded-full border border-slate-500/50 bg-slate-800/75 px-2 py-0.5 text-[10px] text-slate-300">
            {labels.badge3}
          </span>
        </div>

        {state === "loading" ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="h-[110px] animate-pulse rounded-xl border border-slate-700/70 bg-slate-800/35" />
            <div className="h-[110px] animate-pulse rounded-xl border border-slate-700/70 bg-slate-800/35" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-700/80 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{labels.assets}</p>
              <p className="mt-2 text-5xl font-semibold leading-none text-white">
                {String(overview?.universeAssetsTotal ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{labels.active}</p>
              <p className="mt-2 text-5xl font-semibold leading-none text-white">
                {String(overview?.activeSetups ?? 0)}
              </p>
              {(overview?.activeSetups ?? 0) === 0 ? (
                <p className="mt-2 text-[11px] text-slate-400">{labels.emptyActive}</p>
              ) : null}
            </div>
          </div>
        )}

        <p className="border-t border-slate-700/80 pt-3 text-xs text-slate-400">{labels.footer}</p>
      </div>
    </div>
  );
}

type InfoCardProps = {
  icon: JSX.Element;
  title: string;
  text: string;
};

function InfoCard({ icon, title, text }: InfoCardProps): JSX.Element {
  return (
    <div className="h-full rounded-2xl border border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%),_rgba(3,7,18,0.98)] px-4 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.75)]">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/60 bg-sky-500/10 text-sky-200">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="mt-1 text-sm text-slate-200">{text}</p>
    </div>
  );
}


function BadgeDot({ label }: { label: string }): JSX.Element {
  return (
    <span className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      {label}
    </span>
  );
}
