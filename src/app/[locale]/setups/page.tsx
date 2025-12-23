import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { SetupOfTheDayCard } from "@/src/app/[locale]/(marketing)/components/SetupOfTheDayCard";
import HomepageSetupCard from "@/src/components/homepage/HomepageSetupCard";
import { EngineMetaPanel } from "@/src/components/perception/EngineMetaPanel";
import { FiveRingsExplainer } from "@/src/components/perception/FiveRingsExplainer";
import { fetchPerceptionToday } from "@/src/lib/api/perceptionClient";
import type { HomepageSetup } from "@/src/lib/homepage-setups";
import { clamp } from "@/src/lib/math";
import type { Setup } from "@/src/lib/engine/types";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";
import { deriveSetupProfileFromTimeframe } from "@/src/lib/config/setupProfile";
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
    ringAiSummary: setup.ringAiSummary ?? null,
  };
}

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items];
  pool.sort(() => Math.random() - 0.5);
  return pool.slice(0, count);
}

type PageProps = {
  params: Promise<{ locale?: string }>;
  searchParams?: Promise<{ profile?: string }>;
};

export default async function SetupsPage({ params, searchParams }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const localeParam = resolvedParams?.locale ?? i18nConfig.defaultLocale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;
  const messages = getMessages(locale);
  const t = (key: string): string => messages[key] ?? key;
  const labels: Labels = buildLabels(t);

  const profileParam = (await searchParams)?.profile ?? null;
  const { parseProfileFilter, filterSetupsByProfile, isProfileEmpty } = await import("@/src/lib/setups/profileFilter");
  const selectedProfile = parseProfileFilter(profileParam);

  const wantsIntraday = selectedProfile === "intraday";
  const { setups, items, snapshot, meta } = await fetchPerceptionToday(
    wantsIntraday ? { profile: "intraday" } : undefined,
  );
  const filteredSetups = filterSetupsByProfile(setups, selectedProfile);
  const effectiveSetups = filteredSetups.length ? filteredSetups : setups;
  const hasFilteredEmpty = isProfileEmpty(selectedProfile, filteredSetups.length);

  const fulfilledLabel = (meta as { fulfilledLabel?: string } | undefined)?.fulfilledLabel ?? snapshot.label;
  const intradayFallback = wantsIntraday && fulfilledLabel !== "intraday";
  const snapshotTime = snapshot.snapshotTime ? new Date(snapshot.snapshotTime) : null;
  const minutesAgo =
    snapshotTime != null ? Math.round((Date.now() - snapshotTime.getTime()) / 60000) : null;
  const snapshotUnavailable =
    (meta as { snapshotAvailable?: boolean } | undefined)?.snapshotAvailable === false || setups.length === 0;

  const heroItem = items.find((item) => item.isSetupOfTheDay) ?? items[0] ?? null;
  const setupOfTheDayRaw =
    heroItem ? effectiveSetups.find((s) => s.id === heroItem.setupId) : null;
  const primarySetup = setupOfTheDayRaw ?? effectiveSetups[0] ?? null;
  const listCandidates = (filteredSetups.length ? filteredSetups : setups).filter(
    (s) => s.accessLevel === "free",
  );
  const randomSetups = pickRandom(
    listCandidates.filter((s) => s.id !== primarySetup?.id),
    3,
  ).map((setup) => ({
    ...toHomepageSetup(setup),
    snapshotTimestamp: snapshot.snapshotTime,
  }));

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10 space-y-6">
        <div className="space-y-3 pb-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Setups</h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
            Setup des Tages und freie Setups als Vorschau. Mehr Details per Analyse-Button.
          </p>
        </div>

        <ProfileFilters locale={locale} selectedProfile={selectedProfile} t={t} />
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
            {selectedProfile === "intraday"
              ? "Intraday wird stündlich aktualisiert. Noch kein Snapshot verfügbar."
              : "Keine Setups für das gewählte Profil verfügbar."}
          </p>
        ) : null}

        <EngineMetaPanel generatedAt={snapshot.snapshotTime} version={snapshot.version} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Setup des Tages</h2>
          {setupOfTheDayRaw ? (
            <SetupOfTheDayCard setup={setupOfTheDayRaw} generatedAt={snapshot.snapshotTime} />
          ) : (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              Aktuell kein Setup des Tages verfügbar.
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Weitere Setups</h2>
          {hasFilteredEmpty ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              {selectedProfile === "intraday"
                ? t("setups.profileFilter.intradayHint")
                : t("setups.profileFilter.positionHint")}
            </div>
          ) : randomSetups.length > 0 ? (
            <div className="flex flex-col gap-4">
              {randomSetups.map((setup) => (
                <HomepageSetupCard key={setup.id} setup={setup} weakLabel={labels.weakSetup} labels={labels} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              Aktuell nur Setup des Tages verfügbar.
            </div>
          )}
        </section>
        <FiveRingsExplainer t={t} />
      </div>
    </div>
  );
}

function ProfileFilters({
  locale,
  selectedProfile,
  t,
}: {
  locale: string;
  selectedProfile: string | null;
  t: (key: string) => string;
}): JSX.Element {
  const base = `/${locale}/setups`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {["all", "swing", "intraday", "position"].map((key) => {
        const isActive = selectedProfile === key;
        const href = key === "all" ? base : `${base}?profile=${key}`;
        const label = t(`setups.profileFilter.${key}`);
        return (
          <Link
            key={key}
            href={href}
            replace={true}
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
              isActive
                ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100"
                : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
