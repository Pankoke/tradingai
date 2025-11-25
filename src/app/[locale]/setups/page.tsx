import React from "react";
import type { JSX } from "react";
import HomepageHeroSetupCard from "@/src/components/homepage/HomepageHeroSetupCard";
import HomepageSetupCard from "@/src/components/homepage/HomepageSetupCard";
import { EngineMetaPanel } from "@/src/components/perception/EngineMetaPanel";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { clamp } from "@/src/lib/math";
import type { Setup } from "@/src/lib/engine/types";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";

type Labels = ReturnType<typeof buildLabels>;

function getMessages(locale: string): Record<string, string> {
  if (locale === "de") return deMessages as Record<string, string>;
  return enMessages as Record<string, string>;
}

function buildLabels(t: (key: string) => string): {
  directionLong: string;
  directionShort: string;
  confidence: string;
  entry: string;
  stop: string;
  take: string;
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
} {
  return {
    directionLong: t("homepage.labels.directionLong"),
    directionShort: t("homepage.labels.directionShort"),
    confidence: t("homepage.labels.confidence"),
    entry: t("homepage.labels.entry"),
    stop: t("homepage.labels.stop"),
    take: t("homepage.labels.take"),
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

type PageProps = {
  params: Promise<{ locale?: string }>;
};

export default async function SetupsPage({ params }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const localeParam = resolvedParams?.locale ?? i18nConfig.defaultLocale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => messages[key] ?? key;
  const labels: Labels = buildLabels(t);

  const snapshot = await buildPerceptionSnapshot();
  const { setups, setupOfTheDayId } = snapshot;
  const setupOfTheDayRaw = setups.find((s) => s.id === setupOfTheDayId) ?? null;
  const setupOfTheDay = setupOfTheDayRaw ? toHomepageSetup(setupOfTheDayRaw) : null;
  const freeSetups = setups.filter((s) => s.accessLevel === "free" && s.id !== setupOfTheDayId);
  const freeHomepageSetups = freeSetups.map(toHomepageSetup);

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
        <div className="space-y-3 pb-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Setups</h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
            Setup des Tages und freie Setups als Vorschau. Mehr Details per Analyse-Button.
          </p>
        </div>

        <EngineMetaPanel generatedAt={snapshot.generatedAt} version={snapshot.version} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Setup des Tages</h2>
          {setupOfTheDay ? (
            <HomepageHeroSetupCard
              setup={setupOfTheDay}
              title={t("homepage.hero.headline")}
              weakLabel={labels.weakSetup}
              labels={{
                directionLong: labels.directionLong,
                directionShort: labels.directionShort,
                confidence: labels.confidence,
                entry: labels.entry,
                stop: labels.stop,
                take: labels.take,
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
              ctaLabel={t("homepage.hero.cta")}
            />
          ) : (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              Aktuell kein Setup des Tages verfügbar.
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Weitere Setups</h2>
          {freeHomepageSetups.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {freeHomepageSetups.map((setup) => (
                <HomepageSetupCard key={setup.id} setup={setup} weakLabel={labels.weakSetup} labels={labels} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              Aktuell nur Setup des Tages verfügbar.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
