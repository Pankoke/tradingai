"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Activity, BarChart3, Shield, Zap } from "lucide-react";
import HomepageHeroSetupCard from "@/src/components/homepage/HomepageHeroSetupCard";
import HomepageSetupCard from "@/src/components/homepage/HomepageSetupCard";
import { fetchTodaySetups } from "@/src/lib/api/perceptionClient";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { clamp } from "@/src/lib/math";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";

type Labels = ReturnType<typeof buildLabels>;

function buildLabels(t: (key: string) => string): {
  directionLong: string;
  directionShort: string;
  confidence: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  eventHigh: string;
  eventMedium: string;
  eventLow: string;
  biasBullish: string;
  biasBearish: string;
  biasNeutral: string;
  sentimentPositive: string;
  sentimentNegative: string;
  sentimentNeutral: string;
  sourceRuleBased: string;
  orderflowBuyers: string;
  orderflowSellers: string;
  orderflowBalanced: string;
  weakSetup: string;
  heroHeadline: string;
  heroCta: string;
  heroFallback: string;
  listHeadline: string;
  listEmpty: string;
} {
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
    eventLevel: setup.eventScore >= 70 ? "high" : setup.eventScore >= 40 ? "medium" : "low",
    orderflowMode: "balanced",
    bias: {
      direction: setup.biasScore >= 55 ? "Bullish" : setup.biasScore <= 45 ? "Bearish" : "Neutral",
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
  const [setupOfTheDay, setSetupOfTheDay] = useState<HomepageSetup | null>(null);
  const [secondarySetups, setSecondarySetups] = useState<HomepageSetup[]>([]);
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
        const hero = mapped.find((s) => s.id === setupOfTheDayId) ?? mapped[0] ?? null;
        const rest = mapped.filter((s) => s.id !== hero?.id).slice(0, 3);
        setSetupOfTheDay(hero);
        setSecondarySetups(rest);
        setState("ready");
      } catch (error) {
        console.error(error);
        setState("error");
      }
    };
    void load();
  }, []);

  const allSetups = useMemo(
    () => [setupOfTheDay, ...secondarySetups].filter(Boolean) as HomepageSetup[],
    [setupOfTheDay, secondarySetups],
  );
  const assetsAnalyzed = new Set(allSetups.map((s) => s.symbol)).size;
  const activeSetups = allSetups.length;
  const strongSignals = allSetups.filter((s) => !s.weakSignal).length;
  const weakSignals = allSetups.filter((s) => s.weakSignal).length;
  const todayHuman = new Date().toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (state === "loading") {
    return (
      <div className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground">{t("marketing.loading")}</div>
      </div>
    );
  }

  if (state === "error" || !setupOfTheDay) {
    return (
      <div className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-muted-foreground">{labels.heroFallback}</div>
      </div>
    );
  }

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3 text-left">
            <span className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-medium text-sky-700 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:shadow-lg dark:shadow-sky-500/10">
              {t("hero.badge")}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="max-w-3xl text-sm text-slate-200 sm:text-base">
              {t("hero.subtitle")}
            </p>
            <a href="#perception-lab" className="text-sm font-semibold text-sky-400 underline underline-offset-4">
              {t("hero.linkPerception")}
            </a>
          </div>
          <div className="grid w-full max-w-xl grid-cols-2 gap-3 self-start md:mt-6">
            <KpiCard icon={<BarChart3 className="h-4 w-4 text-sky-300" />} label={t("homepage.kpi.assets")} value={assetsAnalyzed} />
            <KpiCard icon={<Activity className="h-4 w-4 text-emerald-300" />} label={t("homepage.kpi.active")} value={activeSetups} />
            <KpiCard icon={<Zap className="h-4 w-4 text-emerald-300" />} label={t("homepage.kpi.strong")} value={strongSignals} />
            <KpiCard icon={<Shield className="h-4 w-4 text-amber-300" />} label={t("homepage.kpi.weak")} value={weakSignals} />
          </div>
        </header>

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

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-emerald-500 dark:text-emerald-300">↗</span>
            <h2 className="text-xl font-semibold text-white">{labels.listHeadline}</h2>
          </div>
          {secondarySetups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-3">
              {secondarySetups.map((setup) => (
                <HomepageSetupCard
                  key={setup.id}
                  setup={setup}
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
                    sourceRuleBased: labels.sourceRuleBased,
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
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
              {labels.listEmpty}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
};

function KpiCard({ icon, label, value }: KpiCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-lg dark:shadow-black/10">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</div>
      </div>
    </div>
  );
}
