"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Activity, BarChart3, Shield, Zap, ActivitySquare } from "lucide-react";
import HomepageHeroSetupCard from "@/src/components/homepage/HomepageHeroSetupCard";
import { fetchTodaySetups } from "@/src/lib/api/perceptionClient";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { clamp } from "@/src/lib/math";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { PerceptionTodayPanel } from "@/src/features/perception/ui/PerceptionTodayPanel";

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

function parseEntryZone(value: string): { from: number; to: number } {
  const matches = value.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length === 0) return { from: 0, to: 0 };
  if (matches.length === 1) {
    const num = parseFloat(matches[0]);
    return { from: num, to: num };
  }
  const nums = matches.map((m) => parseFloat(m));
  return { from: nums[0], to: nums[1] };
}

function toHomepageSetup(setup: Setup): HomepageSetup {
  return {
    id: setup.id,
    symbol: setup.symbol,
    timeframe: setup.timeframe,
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
    stopLoss: parseFloat(setup.stopLoss) || 0,
    takeProfit: parseFloat(setup.takeProfit) || 0,
    snapshotTimestamp: new Date().toISOString(),
  };
}

export default function MarketingPage(): JSX.Element {
  const t = useT();
  const pathname = usePathname();
  const [setupOfTheDay, setSetupOfTheDay] =
    useState<HomepageSetup | null>(null);
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
        const { setups, setupOfTheDayId } = await fetchTodaySetups();
        const mapped = setups.map(toHomepageSetup);
        const hero =
          mapped.find((s) => s.id === setupOfTheDayId) ?? mapped[0] ?? null;
        setSetupOfTheDay(hero);
        setState("ready");
      } catch (error) {
        console.error(error);
        setState("error");
      }
    };
    void load();
  }, []);

  const allSetups = useMemo(
    () => (setupOfTheDay ? [setupOfTheDay] : []),
    [setupOfTheDay],
  );
  const assetsAnalyzed = new Set(allSetups.map((s) => s.symbol)).size;
  const activeSetups = allSetups.length;
  const strongSignals = allSetups.filter((s) => !s.weakSignal).length;
  const weakSignals = allSetups.filter((s) => s.weakSignal).length;
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
            <a
              href="#perception-lab"
              className="text-sm font-semibold text-sky-600 underline underline-offset-4 dark:text-sky-400"
            >
              {t("hero.linkPerception")}
            </a>
          </div>

          <div className="grid w-full max-w-xl grid-cols-2 gap-3 self-start md:mt-6">
            <KpiCard
              icon={<BarChart3 className="h-4 w-4 text-sky-300" />}
              label={t("homepage.kpi.assets")}
              value={assetsAnalyzed}
            />
            <KpiCard
              icon={<Activity className="h-4 w-4 text-emerald-300" />}
              label={t("homepage.kpi.active")}
              value={activeSetups}
            />
            <KpiCard
              icon={<Zap className="h-4 w-4 text-emerald-300" />}
              label={t("homepage.kpi.strong")}
              value={strongSignals}
            />
            <KpiCard
              icon={<Shield className="h-4 w-4 text-amber-300" />}
              label={t("homepage.kpi.weak")}
              value={weakSignals}
            />
          </div>
        </header>

        {/* SETUP OF THE DAY */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
              {todayHuman}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-[1.5px] shadow-sm dark:border-transparent dark:from-sky-500/15 dark:via-transparent dark:to-emerald-500/10 dark:shadow-[0_0_25px_rgba(56,189,248,0.15)]">
            <HomepageHeroSetupCard
              setup={setupOfTheDay}
              title={labels.heroHeadline}
              weakLabel={labels.weakSetup}
              labels={{
                directionLong: labels.directionLong,
                directionShort: labels.directionShort,
                confidence: labels.confidence,
                entry: labels.entry,
                stop: labels.stopLoss,
                take: labels.takeProfit,
                eventHigh: labels.eventHigh,
                eventMedium: labels.eventMedium,
                eventLow: labels.eventLow,
                biasBullish: labels.biasBullish,
                biasBearish: labels.biasBearish,
                biasNeutral: labels.biasNeutral,
                sentimentPositive: labels.sentimentPositive,
                sentimentNegative: labels.sentimentNegative,
                sentimentNeutral: labels.sentimentNeutral,
                orderflowBuyers: labels.orderflowBuyers,
                orderflowSellers: labels.orderflowSellers,
                orderflowBalanced: labels.orderflowBalanced,
              }}
              ctaLabel={labels.heroCta}
            />
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

        {/* LIVE PERCEPTION SNAPSHOT */}
        <PerceptionTodayPanel />

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
                  href="/perception"
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

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
};

function KpiCard({ icon, label, value }: KpiCardProps): JSX.Element {
  return (
    <div className="h-full rounded-2xl border border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),_rgba(4,7,15,0.98)] px-3 py-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.8)]">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="flex items-center justify-center gap-1.5 text-sm text-slate-100">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <div className="text-2xl font-semibold leading-tight text-white">
          {value}
        </div>
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
