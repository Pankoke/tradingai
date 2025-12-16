"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { JSX, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../../../../lib/i18n/ClientProvider";
import clsx from "clsx";
import type { SetupCardSetup } from "./SetupCard";
import { i18nConfig, type Locale } from "../../../../lib/i18n/config";
import { LevelDebugBlock } from "@/src/components/perception/LevelDebugBlock";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import {
  BigGauge,
  SmallGauge,
  getConfidenceGaugePalette,
  getSignalQualityGaugePalette,
} from "@/src/components/perception/RingGauges";
import { formatNumberText, formatRangeText } from "@/src/lib/formatters/levels";
import { RiskRewardBlock } from "@/src/components/perception/RiskRewardBlock";
import { buildEventTooltip } from "@/src/features/perception/ui/eventTooltip";
import { PrimaryTradeSignal } from "@/src/components/perception/PrimaryTradeSignal";
import { ImpactPlaybookCard } from "@/src/components/perception/ImpactPlaybookCard";
import { PositioningGuide } from "@/src/components/perception/PositioningGuide";
import { TraderContextOverlay } from "@/src/components/perception/TraderContextOverlay";
import { EventMicroTimingStrip } from "@/src/components/perception/EventMicroTimingStrip";
import { TraderImpactSummary } from "@/src/components/perception/TraderImpactSummary";
import type { Setup } from "@/src/lib/engine/types";
import { TraderNarrativeBlock } from "@/src/components/perception/TraderNarrativeBlock";
import { SetupRatingBlock } from "@/src/components/perception/SetupRatingBlock";
import { SetupLayoutFrame } from "@/src/components/perception/SetupLayoutFrame";
import { OnboardingHint, OnboardingTourProvider, useOnboardingTour } from "@/src/components/perception/OnboardingTour";
import { RingInsightTabs } from "@/src/components/perception/RingInsightTabs";
import type { RingTabId } from "@/src/components/perception/RingInsightTabs";
import { computeSignalQuality } from "@/src/lib/engine/signalQuality";

type SetupOfTheDayCardProps = {
  setup: SetupCardSetup;
  generatedAt?: string;
};

type LevelBoxPropsDay = {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "success";
};

type RingTileDefinition = {
  id: RingTabId;
  labelKey: string;
  value: number;
  tone: "accent" | "green" | "teal";
  tooltip?: ReactNode;
};

type RingCategoryPalette = {
  borderClass: string;
  activeBorderClass: string;
  labelClass: string;
  gaugeColor: string;
};

const RING_SCORE_LEVELS = [75, 60, 45, 30, 0];

const RING_CATEGORY_THEMES: Record<
  RingTabId,
  {
    borderClass: string;
    activeBorderClass: string;
    labelClass: string;
    colors: string[];
  }
> = {
  trend: {
    borderClass: "border-teal-500/20",
    activeBorderClass: "border-teal-400/70",
    labelClass: "text-teal-200",
    colors: ["#14b8a6", "#2dd4bf", "#38bdf8", "#0ea5e9", "#06b6d4"],
  },
  event: {
    borderClass: "border-violet-500/20",
    activeBorderClass: "border-violet-400/70",
    labelClass: "text-violet-200",
    colors: ["#a855f7", "#c084fc", "#d946ef", "#e879f9", "#9333ea"],
  },
  bias: {
    borderClass: "border-emerald-500/20",
    activeBorderClass: "border-emerald-400/70",
    labelClass: "text-emerald-200",
    colors: ["#22c55e", "#21c2a1", "#34d399", "#4ade80", "#22c55e"],
  },
  sentiment: {
    borderClass: "border-amber-500/20",
    activeBorderClass: "border-amber-400/70",
    labelClass: "text-amber-200",
    colors: ["#f97316", "#fbbf24", "#f59e0b", "#d97706", "#fbbf24"],
  },
  orderflow: {
    borderClass: "border-sky-500/20",
    activeBorderClass: "border-sky-400/70",
    labelClass: "text-sky-200",
    colors: ["#0ea5e9", "#38bdf8", "#60a5fa", "#3b82f6", "#2563eb"],
  },
};

function getRingCategoryPalette(id: RingTabId, score: number): RingCategoryPalette {
  const normalized = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const theme = RING_CATEGORY_THEMES[id];
  let index = 0;
  for (let i = 0; i < RING_SCORE_LEVELS.length; i++) {
    if (normalized >= RING_SCORE_LEVELS[i]) {
      index = i;
      break;
    }
  }
  const color = theme.colors[Math.min(index, theme.colors.length - 1)];
  return {
    borderClass: theme.borderClass,
    activeBorderClass: theme.activeBorderClass,
    labelClass: theme.labelClass,
    gaugeColor: color,
  };
}
function localePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return `/${maybeLocale}`;
  }
  return `/${i18nConfig.defaultLocale}`;
}

function toneClass(tone: LevelBoxPropsDay["tone"]): string {
  if (tone === "danger") return "text-red-400";
  if (tone === "success") return "text-emerald-400";
  return "text-slate-100";
}

type ConfidenceConsistencyLevel = "low" | "medium" | "high";
type EventRiskLevel = "low" | "medium" | "high";

function resolveLocale(pathname: string): Locale {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  if (i18nConfig.locales.includes(maybeLocale as Locale)) {
    return maybeLocale as Locale;
  }
  return i18nConfig.defaultLocale;
}

function toIntlLocale(locale: Locale): string {
  return locale === "de" ? "de-DE" : "en-US";
}

function formatGeneratedAtLabel(value: string | null | undefined, locale: Locale, t: (key: string) => string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const formatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
  return `${t("setups.generatedAtLabel")}: ${formatter.format(date)}`;
}

function deriveConsistencyLevel(score?: number): ConfidenceConsistencyLevel {
  if (score === undefined) return "medium";
  if (score >= 60) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function deriveEventRiskLevel(score?: number): EventRiskLevel {
  if (score === undefined) return "medium";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function SetupOfTheDayCard({ setup, generatedAt }: SetupOfTheDayCardProps): JSX.Element {
  return (
    <OnboardingTourProvider>
      <SetupOfTheDayCardInner setup={setup} generatedAt={generatedAt} />
    </OnboardingTourProvider>
  );
}

function SetupOfTheDayCardInner({ setup, generatedAt }: SetupOfTheDayCardProps): JSX.Element {
  const t = useT();
  const { startTour, isCompleted } = useOnboardingTour();
  const isLong = setup.direction === "Long";
  const pathname = usePathname();
  const prefix = useMemo(() => localePrefix(pathname), [pathname]);
  const locale = useMemo(() => resolveLocale(pathname), [pathname]);
  const meta = getAssetMeta(setup.assetId, setup.symbol);
  const headline = formatAssetLabel(setup.assetId, setup.symbol);
  const rings = setup.rings;
  const compactRings: RingTileDefinition[] = [
    {
      id: "trend",
      labelKey: "perception.today.trendRing",
      value: rings.trendScore,
      tone: "teal",
      tooltip: t("perception.rings.tooltip.trend"),
    },
    {
      id: "event",
      labelKey: "perception.today.eventRing",
      value: rings.eventScore,
      tone: "accent",
      tooltip: buildEventTooltip(t("perception.rings.tooltip.event"), setup.eventContext, t),
    },
    {
      id: "bias",
      labelKey: "perception.today.biasRing",
      value: rings.biasScore,
      tone: "green",
      tooltip: t("perception.rings.tooltip.bias"),
    },
    {
      id: "sentiment",
      labelKey: "perception.today.sentimentRing",
      value: rings.sentimentScore,
      tone: "teal",
      tooltip: t("perception.rings.tooltip.sentiment"),
    },
    {
      id: "orderflow",
      labelKey: "perception.today.orderflowRing",
      value: rings.orderflowScore,
      tone: "accent",
      tooltip: t("perception.rings.tooltip.orderflow"),
    },
  ];

  type CompactRing = typeof compactRings[number];

  function RingTile({ ring, isActive, onClick }: { ring: CompactRing; isActive: boolean; onClick: () => void }) {
    const palette = getRingCategoryPalette(ring.id, ring.value ?? 0);
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isActive}
        className={clsx(
          "flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-[0.7rem] font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
          "bg-slate-900/50 shadow-[0_10px_25px_rgba(2,6,23,0.5)]",
          palette.borderClass,
          isActive ? `${palette.activeBorderClass} bg-slate-800` : "border-slate-700/40",
        )}
      >
        <SmallGauge
          value={ring.value}
          label=""
          tone={ring.tone}
          tooltip={ring.tooltip}
          fillColor={palette.gaugeColor}
          tooltipClassName={ring.tooltip ? "text-sm leading-snug" : undefined}
        />
        <span className={clsx("text-[0.7rem] font-semibold", palette.labelClass)}>{t(ring.labelKey)}</span>
      </button>
    );
  }

  const [showNarrative, setShowNarrative] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const signalQuality = useMemo(
    () => computeSignalQuality(setup as unknown as Setup),
    [setup],
  );
  const confidenceScore = rings.confidenceScore ?? setup.confidence ?? 0;
  const signalQualityReasons = signalQuality.reasons.slice(0, 2);
  const confidenceSummaryLabel = t("perception.confidence.summaryLabel").replace(
    "{score}",
    String(Math.round(confidenceScore)),
  );
  const consistencyLevel = deriveConsistencyLevel(confidenceScore);
  const eventRiskLevel = deriveEventRiskLevel(rings.eventScore);
  const confidenceBullets = [
    t(`perception.confidence.bullets.consistency.${consistencyLevel}`),
    t(`perception.confidence.bullets.eventRisk.${eventRiskLevel}`),
  ];
  const signalPalette = getSignalQualityGaugePalette(signalQuality.score);
  const confidencePalette = getConfidenceGaugePalette(confidenceScore);
  const generatedTimestamp = generatedAt ?? setup.snapshotCreatedAt ?? null;
  const generatedAtText = useMemo(
    () => formatGeneratedAtLabel(generatedTimestamp, locale, t),
    [generatedTimestamp, locale, t],
  );
  const [activeRing, setActiveRing] = useState<RingTabId>("trend");
  const [detailExpanded, setDetailExpanded] = useState(false);
  useEffect(() => {
    setDetailExpanded(false);
  }, [activeRing]);
  const impactSummaryText =
    setup.ringAiSummary?.longSummary ??
    setup.ringAiSummary?.shortSummary ??
    t("perception.impactPlaybook.summaryFallback");

  const headerContent = !isCompleted ? (
    <div className="flex items-center justify-between rounded-lg border border-sky-700/60 bg-sky-900/30 px-4 py-2 text-xs text-slate-100">
      <span className="font-medium">{t("perception.onboarding.setupIntroTitle")}</span>
      <button
        type="button"
        className="text-[0.7rem] font-semibold uppercase tracking-wide text-sky-300 transition hover:text-sky-200"
        onClick={startTour}
      >
        {t("perception.onboarding.startTour")}
      </button>
    </div>
  ) : null;

  const decisionContent = (
    <>
      <OnboardingHint
        stepId="decision"
        title={t("perception.onboarding.decision.title")}
        description={t("perception.onboarding.decision.description")}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.35em] text-slate-300">
                {t("setups.setupOfTheDay")}
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {headline} · {setup.timeframe}
              </h2>
              <p className={`text-4xl font-bold ${isLong ? "text-emerald-400" : "text-rose-400"}`}>{setup.direction}</p>
              <p className="text-sm text-slate-400">{meta.name}</p>
              <span className="inline-flex w-fit rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                {setup.type === "Regelbasiert" ? t("setups.type.ruleBased") : t("setups.type.ai")}
              </span>
            </div>
            {generatedAtText ? (
              <p className="text-xs text-slate-400 sm:text-right">{generatedAtText}</p>
            ) : null}
          </div>
        </div>
      </OnboardingHint>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.55)]">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.3em] text-slate-300">
            {t("perception.metaSignals.heading")}
          </p>
          <div className="mt-3 grid gap-3 text-[0.75rem] sm:grid-cols-2 lg:grid-cols-5">
            {compactRings.map((ring) => (
              <RingTile
                key={ring.id}
                ring={ring}
                isActive={activeRing === ring.id}
                onClick={() => setActiveRing(ring.id)}
              />
            ))}
          </div>
          <div
            className={clsx(
              "relative mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-4 transition-all duration-300",
              detailExpanded ? "max-h-[1200px]" : "max-h-[260px]",
            )}
          >
            <RingInsightTabs
              setup={setup}
              variant="full"
              showSignalQualityInline={false}
              activeRing={activeRing}
              onActiveRingChange={setActiveRing}
              showTabButtons={false}
            />
            {!detailExpanded && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 transition hover:text-slate-200"
              onClick={() => setDetailExpanded((prev) => !prev)}
            >
              {detailExpanded ? t("perception.setup.details.showLess") : t("perception.setup.details.showMore")}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <LevelBox label={t("setups.entry")} value={formatRangeText(setup.entryZone)} tone="neutral" />
          <LevelBox label={t("setups.stopLoss")} value={formatNumberText(setup.stopLoss)} tone="danger" />
          <LevelBox label={t("setups.takeProfit")} value={formatNumberText(setup.takeProfit)} tone="success" />
        </div>

        <RiskRewardBlock riskReward={setup.riskReward ?? null} />

        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
                {t("perception.setup.sections.rating")}
              </h3>
              <SetupRatingBlock
                setup={setup as unknown as Setup}
                ringAiSummary={setup.ringAiSummary ?? null}
                riskReward={setup.riskReward ?? null}
                eventContext={setup.eventContext ?? null}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
                {t("perception.setup.sections.tradeSignal")}
              </h3>
              <PrimaryTradeSignal setup={setup} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
                {t("perception.setup.sections.positioning")}
              </h3>
              <PositioningGuide setup={setup} />
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const driversContent = (
    <>
      <div className="space-y-4">
        <OnboardingHint
          stepId="drivers"
          title={t("perception.onboarding.drivers.title")}
          description={t("perception.onboarding.drivers.description")}
        >
          <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
            {t("perception.setup.sections.driversOverview")}
          </h3>
        </OnboardingHint>
        <ImpactPlaybookCard summary={impactSummaryText} setup={setup as unknown as Setup} />
      </div>
    </>
  );

  const detailsContent = (
    <>
      <div className="space-y-3">
        <OnboardingHint
          stepId="details"
          title={t("perception.onboarding.details.title")}
          description={t("perception.onboarding.details.description")}
        >
          <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
            {t("perception.setup.sections.context")}
          </h3>
        </OnboardingHint>
        <div className="grid gap-4 lg:grid-cols-2">
          <TraderContextOverlay setup={setup} />
          <EventMicroTimingStrip eventContext={setup.eventContext ?? null} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
              {t("perception.setup.sections.impactOverview")}
            </h3>
            <button
              type="button"
              className="w-full text-left text-sm font-medium text-slate-200 transition hover:text-white sm:w-auto"
              onClick={() => setShowImpact((prev) => !prev)}
            >
              {showImpact ? t("perception.setup.details.hideImpact") : t("perception.setup.details.showImpact")}
            </button>
          </div>
          <p className="text-xs text-slate-400">{t("perception.setup.sections.impactHint")}</p>
        </div>
        {showImpact && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-200 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)] transition-all duration-300 ease-in-out">
            <TraderImpactSummary
              setup={setup as unknown as Setup}
              ringAiSummary={setup.ringAiSummary ?? null}
              riskReward={setup.riskReward ?? null}
              eventContext={setup.eventContext ?? null}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
              {t("perception.setup.sections.narrative")}
            </h3>
            <button
              type="button"
              className="w-full text-left text-sm font-medium text-slate-200 transition hover:text-white sm:w-auto"
              onClick={() => setShowNarrative((prev) => !prev)}
            >
              {showNarrative ? t("perception.setup.details.hideNarrative") : t("perception.setup.details.showNarrative")}
            </button>
          </div>
          <p className="text-xs text-slate-400">{t("perception.setup.sections.narrativeHint")}</p>
        </div>
        {showNarrative && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)] transition-all duration-300 ease-in-out">
            <TraderNarrativeBlock
              setup={setup as unknown as Setup}
              ringAiSummary={setup.ringAiSummary ?? null}
              riskReward={setup.riskReward ?? null}
              eventContext={setup.eventContext ?? null}
            />
          </div>
        )}
      </div>

      <div className="pt-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]">
          <LevelDebugBlock
            category={setup.category ?? setup.levelDebug?.category}
            referencePrice={setup.levelDebug?.referencePrice ?? null}
            bandPct={setup.levelDebug?.bandPct ?? null}
            volatilityScore={setup.levelDebug?.volatilityScore ?? null}
            scoreVolatility={setup.levelDebug?.scoreVolatility ?? null}
            entryZone={setup.entryZone}
            stopLoss={setup.stopLoss}
            takeProfit={setup.takeProfit}
            rings={setup.rings}
            snapshotId={setup.snapshotId ?? null}
            snapshotCreatedAt={setup.snapshotCreatedAt ?? null}
            eventContext={setup.eventContext ?? null}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href={`${prefix}/setups/${setup.id}`}
          className="rounded-full bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition hover:brightness-110"
        >
          {t("setups.openAnalysis")}
        </Link>
      </div>
    </>
  );

  return <SetupLayoutFrame header={headerContent} decision={decisionContent} drivers={driversContent} details={detailsContent} />;
}

const detailBoxClass = "rounded-2xl border border-slate-800 bg-[#0f172a]/80 px-4 py-3 shadow-[inset_0_0_25px_rgba(15,23,42,0.9)]";

function LevelBox({ label, value, tone = "neutral" }: LevelBoxPropsDay): JSX.Element {
  return (
    <div className={detailBoxClass}>
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass(tone)}`}>{value}</div>
    </div>
  );
}
