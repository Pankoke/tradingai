import React, { Suspense } from "react";
import type { JSX } from "react";
import Link from "next/link";
import HomepageSetupCard from "@/src/components/homepage/HomepageSetupCard";
import { PremiumControls } from "@/src/components/setups/PremiumControls";
import { EngineMetaPanel } from "@/src/components/perception/EngineMetaPanel";
import { ProNotice } from "@/src/components/common/ProNotice";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { clamp } from "@/src/lib/math";
import { mockEvents } from "@/src/lib/mockEvents";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { PerceptionTodayPanel } from "@/src/features/perception/ui/PerceptionTodayPanel";

type PageProps = {
  params: Promise<{ locale?: string }>;
  searchParams?: Promise<{
    sort?: string;
    dir?: string;
    filter?: string;
  }>;
};

function applyFilter(setups: Setup[], filter: string): Setup[] {
  if (filter === "long") return setups.filter((s) => s.direction === "Long");
  if (filter === "short") return setups.filter((s) => s.direction === "Short");
  return setups;
}

function applySort(setups: Setup[], sort: string, dir: string): Setup[] {
  const direction = dir === "asc" ? 1 : -1;
  const cloned = [...setups];
  return cloned.sort((a, b) => {
    if (sort === "confidence") return (a.confidence - b.confidence) * direction;
    if (sort === "sentiment") return (a.sentimentScore - b.sentimentScore) * direction;
    if (sort === "timeframe") return a.timeframe.localeCompare(b.timeframe) * direction;
    if (sort === "direction") return a.direction.localeCompare(b.direction) * direction;
    return (a.confidence - b.confidence) * direction;
  });
}

function getMessages(locale: string): Record<string, string> {
  if (locale === "de") return deMessages as Record<string, string>;
  return enMessages as Record<string, string>;
}

function buildLabels(t: (key: string) => string) {
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
    orderflowBuyers: t("homepage.labels.orderflowBuyers"),
    orderflowSellers: t("homepage.labels.orderflowSellers"),
    orderflowBalanced: t("homepage.labels.orderflowBalanced"),
    sourceRuleBased: t("homepage.labels.sourceRuleBased"),
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
    assetId: setup.assetId,
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

export default async function PremiumSetupsPage({ params, searchParams }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const localeParam = resolvedParams?.locale ?? i18nConfig.defaultLocale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => messages[key] ?? key;
  const labels = buildLabels(t);

  const snapshot = await buildPerceptionSnapshot();
  const { setups } = snapshot;
  const events = mockEvents;

  const sort = resolvedSearch?.sort ?? "confidence";
  const dir = resolvedSearch?.dir ?? "desc";
  const filter = resolvedSearch?.filter ?? "all";

  const filtered = applyFilter(setups, filter);
  const sorted = applySort(filtered, sort, dir);
  const freeSetups = sorted.filter((s) => s.accessLevel === "free").map(toHomepageSetup);
  const premiumSetups = sorted.filter((s) => s.accessLevel === "premium").map(toHomepageSetup);
  const proSetups = sorted.filter((s) => s.accessLevel === "pro").map(toHomepageSetup);

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:py-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Premium Setups</h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">{t("premium.info")}</p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-primary)]">
              Loading live snapshot ...
            </div>
          }
        >
          <PerceptionTodayPanel />
        </Suspense>

        <EngineMetaPanel generatedAt={snapshot.generatedAt} version={snapshot.version} />

        <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-primary)] shadow-[0_0_0_1px_rgba(14,165,233,0.15)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--text-primary)] font-semibold">Events & Bias</span>
            <span>
              Heute {events.length} relevante Events. High-Impact-Events und Bias fließen ins Ranking ein.
            </span>
            <Link
              href="/perception"
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            >
              Mehr erfahren
            </Link>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-primary)]">
              Lädt Filter ...
            </div>
          }
        >
          <PremiumControls currentSort={sort} currentDir={dir} currentFilter={filter} />
        </Suspense>

        <ProNotice context="setupsPremium" />

        <div className="space-y-8">
          {freeSetups.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t("premium.section.free")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {freeSetups.map((setup) => (
                  <HomepageSetupCard key={setup.id} setup={setup} weakLabel={labels.weakSetup} labels={labels} />
                ))}
              </div>
            </section>
          ) : null}

          {premiumSetups.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t("premium.section.premium")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {premiumSetups.map((setup) => (
                  <HomepageSetupCard key={setup.id} setup={setup} weakLabel={labels.weakSetup} labels={labels} />
                ))}
              </div>
            </section>
          ) : null}

          {proSetups.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t("premium.section.pro")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {proSetups.map((setup) => (
                  <HomepageSetupCard key={setup.id} setup={setup} weakLabel={labels.weakSetup} labels={labels} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
