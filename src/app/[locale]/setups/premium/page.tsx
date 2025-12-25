import React, { Suspense } from "react";
import type { JSX } from "react";
import HomepageSetupCard from "@/src/components/homepage/HomepageSetupCard";
import { PremiumControls } from "@/src/components/setups/PremiumControls";
import {
  applyFilter,
  applySort,
  buildAssetOptions,
  filterPremiumByProfile,
  type SortDir,
  type SortKey,
} from "@/src/components/setups/premiumHelpers";
import { clamp } from "@/src/lib/math";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { deriveSetupProfileFromTimeframe } from "@/src/lib/config/setupProfile";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { fetchPerceptionToday } from "@/src/lib/api/perceptionClient";
import type { Setup } from "@/src/lib/engine/types";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { ProfileFilters } from "@/src/lib/setups/profileFilters";
import type { ProfileFilter } from "@/src/lib/setups/profileFilter";
import { EngineMetaPanel } from "@/src/components/perception/EngineMetaPanel";

type PageProps = {
  params: Promise<{ locale?: string }>;
  searchParams?: Promise<{
    sort?: string;
    dir?: string;
    filter?: string;
    asset?: string;
    profile?: string;
  }>;
};

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
    profile: setup.profile ?? deriveSetupProfileFromTimeframe(setup.timeframe),
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
    sentiment: setup.sentiment ?? null,
    orderflow: setup.orderflow ?? null,
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

  const profileParam = resolvedSearch?.profile ?? null;
  const wantsIntraday = profileParam === "intraday";
  const { setups, snapshot, meta } = await fetchPerceptionToday(
    wantsIntraday ? { profile: "intraday" } : undefined,
  );
  const profileResult = filterPremiumByProfile(setups, profileParam);
  const selectedProfile = profileResult.selectedProfile as ProfileFilter | null;

  const sort = resolvedSearch?.sort ?? "confidence";
  const dir = resolvedSearch?.dir ?? "desc";
  const filter = resolvedSearch?.filter ?? "all";
  const assetFilter = resolvedSearch?.asset ?? "all";

  const sortKey: SortKey = ["signal_quality", "confidence", "risk_reward", "direction"].includes(sort ?? "")
    ? (sort as SortKey)
    : "signal_quality";
  const sortDir: SortDir = dir === "asc" ? "asc" : "desc";

  const filtered = applyFilter(profileResult.effective, filter, assetFilter);
  const sorted = applySort(filtered, sortKey, sortDir);
  const allSetups = sorted.map(toHomepageSetup);
  const assetOptions = buildAssetOptions(profileResult.effective);

  const fulfilledLabel = (meta as { fulfilledLabel?: string } | undefined)?.fulfilledLabel ?? snapshot.label;
  const intradayFallback = wantsIntraday && fulfilledLabel !== "intraday";
  const snapshotTime = snapshot.snapshotTime ? new Date(snapshot.snapshotTime) : null;
  const minutesAgo = snapshotTime ? Math.round((Date.now() - snapshotTime.getTime()) / 60000) : null;
  const snapshotUnavailable =
    (meta as { snapshotAvailable?: boolean } | undefined)?.snapshotAvailable === false || profileResult.effective.length === 0;
  const profileLabels: Record<ProfileFilter, string> = {
    all: messages["setups.profileFilter.all"],
    swing: messages["setups.profileFilter.swing"],
    intraday: messages["setups.profileFilter.intraday"],
    position: messages["setups.profileFilter.position"],
  };
  const profileFilterKeys: ProfileFilter[] = ["swing", "intraday", "position"];

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:py-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Premium Setups</h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
            {t("setups.subtitle")}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("setups.profileFilter.heading")}
          </p>
          <ProfileFilters
            selectedProfile={selectedProfile}
            basePath={`/${locale}/setups/premium`}
            labels={profileLabels}
            keys={profileFilterKeys}
          />
        </div>
        {wantsIntraday ? (
          <p className="text-xs text-[var(--text-secondary)]">
            {intradayFallback
              ? "Intraday snapshot not available yet – showing latest daily snapshot."
              : minutesAgo != null
                ? `Last intraday update: ${minutesAgo} min ago`
                : "Intraday snapshot loaded."}
          </p>
        ) : null}
        {snapshotUnavailable ? (
          <p className="text-xs text-amber-300">
            {profileResult.selectedProfile === "intraday"
              ? "Intraday wird stündlich aktualisiert. Noch kein Snapshot verfügbar."
              : "Keine Setups für das gewählte Profil verfügbar."}
          </p>
        ) : null}

        <Suspense
          fallback={
            <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-primary)]">
              Lädt Filter ...
            </div>
          }
        >
          <PremiumControls
            currentSort={sort}
            currentDir={dir}
            currentFilter={filter}
            currentAsset={assetFilter}
            assets={assetOptions}
          />
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
        <div className="pt-2">
          <EngineMetaPanel generatedAt={snapshot.snapshotTime} version={snapshot.version} />
        </div>
      </div>
    </div>
  );
}
