import React, { Suspense } from "react";
import type { JSX } from "react";
import HomepageSetupCard from "@/src/components/homepage/HomepageSetupCard";
import { PremiumControls } from "@/src/components/setups/PremiumControls";
import { clamp } from "@/src/lib/math";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { fetchPerceptionToday } from "@/src/lib/api/perceptionClient";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";

type PageProps = {
  params: Promise<{ locale?: string }>;
  searchParams?: Promise<{
    sort?: string;
    dir?: string;
    filter?: string;
    asset?: string;
  }>;
};

function applyFilter(setups: Setup[], filter: string, asset?: string | null): Setup[] {
  const byDirection =
    filter === "long" ? setups.filter((s) => s.direction === "Long") : filter === "short" ? setups.filter((s) => s.direction === "Short") : setups;
  if (asset && asset !== "all") {
    const match = asset.toLowerCase();
    return byDirection.filter((s) => s.symbol.toLowerCase() === match);
  }
  return byDirection;
}

function applySort(setups: Setup[], sort: string, dir: string): Setup[] {
  const direction = dir === "asc" ? 1 : -1;
  const cloned = [...setups];
  const getSignalQualityScore = (s: Setup): number => {
    const fromField = (s as unknown as { signalQuality?: number }).signalQuality;
    if (typeof fromField === "number") return fromField;
    const fromRings = (s.rings as unknown as { confidenceScore?: number })?.confidenceScore;
    if (typeof fromRings === "number") return fromRings;
    return 0;
  };
  const getRrr = (s: Setup): number => {
    return s.riskReward?.rrr ?? 0;
  };
  const getGeneratedTime = (s: Setup): string => {
    return s.snapshotCreatedAt ?? (s as unknown as { snapshotTimestamp?: string }).snapshotTimestamp ?? "";
  };

  return cloned.sort((a, b) => {
    if (sort === "confidence") return (a.confidence - b.confidence) * direction;
    if (sort === "sentiment") return (a.sentimentScore - b.sentimentScore) * direction;
    if (sort === "direction") return a.direction.localeCompare(b.direction) * direction;
    if (sort === "signalQuality") return (getSignalQualityScore(a) - getSignalQualityScore(b)) * direction;
    if (sort === "rrr") return (getRrr(a) - getRrr(b)) * direction;
    if (sort === "generated") return getGeneratedTime(a).localeCompare(getGeneratedTime(b)) * direction;
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
    stopLoss: parseNumber(setup.stopLoss),
    takeProfit: parseNumber(setup.takeProfit),
    category: setup.category ?? null,
    levelDebug: setup.levelDebug,
    snapshotTimestamp: new Date().toISOString(),
    snapshotId: setup.snapshotId ?? null,
    snapshotCreatedAt: setup.snapshotCreatedAt ?? null,
    rings: setup.rings,
    riskReward: setup.riskReward,
    eventContext: setup.eventContext ?? null,
    ringAiSummary: setup.ringAiSummary ?? null,
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

  const { setups } = await fetchPerceptionToday();

  const sort = resolvedSearch?.sort ?? "confidence";
  const dir = resolvedSearch?.dir ?? "desc";
  const filter = resolvedSearch?.filter ?? "all";
  const assetFilter = resolvedSearch?.asset ?? "all";

  const filtered = applyFilter(setups, filter, assetFilter);
  const sorted = applySort(filtered, sort, dir);
  const allSetups = sorted.map(toHomepageSetup);
  const assetCounts = setups.reduce<Record<string, number>>((acc, setup) => {
    acc[setup.symbol] = (acc[setup.symbol] ?? 0) + 1;
    return acc;
  }, {});
  const availableAssets = Object.entries(assetCounts)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map(([symbol]) => symbol);

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:py-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Premium Setups</h1>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-primary)]">
              Lädt Filter ...
            </div>
          }
        >
          <PremiumControls currentSort={sort} currentDir={dir} currentFilter={filter} currentAsset={assetFilter} assets={availableAssets} />
        </Suspense>

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Setups heute</h2>
            {allSetups.length > 0 ? (
              <div className="flex flex-col gap-4">
                {allSetups.map((setup) => (
                  <HomepageSetupCard key={setup.id} setup={setup} weakLabel={labels.weakSetup} labels={labels} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
                {t("perception.today.empty")}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
