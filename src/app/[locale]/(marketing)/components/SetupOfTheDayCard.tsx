"use client";



import React, { useMemo, useState, useEffect } from "react";

import type { JSX, ReactNode } from "react";

import Link from "next/link";

import { usePathname } from "next/navigation";

import { useT } from "../../../../lib/i18n/ClientProvider";

import clsx from "clsx";

import { Copy } from "lucide-react";

import type { SetupCardSetup } from "./SetupCard";

import { i18nConfig, type Locale } from "../../../../lib/i18n/config";

import { LevelDebugBlock } from "@/src/components/perception/LevelDebugBlock";

import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";

import {

  BigGauge,

  SmallGauge,

  getConfidenceGaugePalette,

  getSignalQualityGaugePalette,

  type GaugePalette,

} from "@/src/components/perception/RingGauges";

import { RiskRewardBlock } from "@/src/components/perception/RiskRewardBlock";

import { buildEventTooltip } from "@/src/features/perception/ui/eventTooltip";

import { classifyTradeSignal } from "@/src/components/perception/PrimaryTradeSignal";

import { ImpactPlaybookCard } from "@/src/components/perception/ImpactPlaybookCard";

import { TraderContextOverlay } from "@/src/components/perception/TraderContextOverlay";

import { EventMicroTimingStrip } from "@/src/components/perception/EventMicroTimingStrip";

import { TraderImpactSummary } from "@/src/components/perception/TraderImpactSummary";

import type { Setup } from "@/src/lib/engine/types";

import { TraderNarrativeBlock } from "@/src/components/perception/TraderNarrativeBlock";

import { SetupLayoutFrame } from "@/src/components/perception/SetupLayoutFrame";

import { OnboardingHint, OnboardingTourProvider, useOnboardingTour } from "@/src/components/perception/OnboardingTour";

import { RingInsightTabs } from "@/src/components/perception/RingInsightTabs";

import type { RingTabId } from "@/src/components/perception/RingInsightTabs";

import { computeSignalQuality } from "@/src/lib/engine/signalQuality";
import {
  analyzeEventContext,
  pickPrimaryEventCandidate,
  type EventContextInsights,
  type PrimaryEventCandidate,
} from "@/src/components/perception/eventContextInsights";



type SetupOfTheDayCardProps = {

  setup: SetupCardSetup;

  generatedAt?: string;

};



const RANGE_VALUE_REGEX = /-?\d+(\.\d+)?/g;



type RingTileDefinition = {

  id: RingTabId;

  labelKey: string;

  value: number;

  tone: "accent" | "green" | "teal";

  tooltip?: ReactNode;

};



type RingCategoryPalette = {

  activeRingClass: string;

  labelClass: string;

  gaugeColor: string;

};



const RING_SCORE_LEVELS = [75, 60, 45, 30, 0];



const RING_CATEGORY_THEMES: Record<

  RingTabId,

  {

    activeRingClass: string;

    labelClass: string;

    colors: string[];

  }

> = {

  trend: {

    activeRingClass: "ring-teal-400/80",

    labelClass: "text-teal-200",

    colors: ["#14b8a6", "#2dd4bf", "#38bdf8", "#0ea5e9", "#06b6d4"],

  },

  event: {

    activeRingClass: "ring-violet-400/80",

    labelClass: "text-violet-200",

    colors: ["#a855f7", "#c084fc", "#d946ef", "#e879f9", "#9333ea"],

  },

  bias: {

    activeRingClass: "ring-emerald-400/80",

    labelClass: "text-emerald-200",

    colors: ["#22c55e", "#21c2a1", "#34d399", "#4ade80", "#22c55e"],

  },

  sentiment: {

    activeRingClass: "ring-amber-400/80",

    labelClass: "text-amber-200",

    colors: ["#f97316", "#fbbf24", "#f59e0b", "#d97706", "#fbbf24"],

  },

  orderflow: {

    activeRingClass: "ring-sky-400/80",

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

    activeRingClass: theme.activeRingClass,

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



function buildNumberFormatter(locale: Locale): Intl.NumberFormat {

  return new Intl.NumberFormat(toIntlLocale(locale), {

    minimumFractionDigits: 2,

    maximumFractionDigits: 4,

  });

}



type EntryDescriptor = {

  display: string;

  noteKey: "setups.entry.note.zone" | "setups.entry.note.limit" | "setups.entry.note.market" | "setups.entry.note.default";

  copyValue: string | null;

};



function formatEntryDescriptor(
  entryZone: string | null | undefined,
  formatter: Intl.NumberFormat,
): EntryDescriptor {
  if (!entryZone) {
    return { display: "n/a", noteKey: "setups.entry.note.default", copyValue: null };
  }
  const normalized = entryZone.toLowerCase();
  if (normalized.includes("market")) {
    return { display: entryZone, noteKey: "setups.entry.note.market", copyValue: entryZone };
  }
  const matches = entryZone.match(RANGE_VALUE_REGEX);
  if (!matches || matches.length === 0) {
    return { display: entryZone, noteKey: "setups.entry.note.default", copyValue: entryZone };
  }
  if (matches.length === 1) {
    const raw = Number(matches[0]);
    const display = Number.isFinite(raw) ? formatter.format(raw) : "n/a";
    return {
      display,
      noteKey: "setups.entry.note.limit",
      copyValue: Number.isFinite(raw) ? matches[0] : null,
    };
  }
  const values = matches.slice(0, 2).map((match) => Number(match));
  const [a, b] = values;
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return {
      display: `${formatter.format(a)} - ${formatter.format(b)}`,
      noteKey: "setups.entry.note.zone",
      copyValue: `${matches[0]} - ${matches[1]}`,
    };
  }
  return { display: entryZone, noteKey: "setups.entry.note.default", copyValue: entryZone };
}

function formatPriceValue(

  value: string | null | undefined,

  formatter: Intl.NumberFormat,

): { display: string; copyValue: string | null } {

  if (value === undefined || value === null) {

    return { display: "n/a", copyValue: null };

  }

  const num = Number(value);

  if (!Number.isFinite(num)) {

    return { display: value, copyValue: value };

  }

  return {

    display: formatter.format(num),

    copyValue: value,

  };

}



function deriveStopNoteKey(levelDebug?: Setup["levelDebug"]): "setups.stop.note.structure" | "setups.stop.note.volatility" | "setups.stop.note.default" {

  if (!levelDebug?.category && levelDebug?.volatilityScore == null) {

    return "setups.stop.note.default";

  }

  const category = levelDebug?.category?.toLowerCase() ?? "";

  if (category.includes("struct") || category.includes("range") || category.includes("swing")) {

    return "setups.stop.note.structure";

  }

  if (category.includes("volatility") || (typeof levelDebug?.volatilityScore === "number" && levelDebug.volatilityScore >= 60)) {

    return "setups.stop.note.volatility";

  }

  return "setups.stop.note.default";

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
    year: "numeric",
    month: locale === "de" ? "2-digit" : "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin",
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

  const numberFormatter = useMemo(() => buildNumberFormatter(locale), [locale]);

  const rings = setup.rings;
  const eventContext = setup.eventContext ?? null;
  const eventInsights = useMemo(() => analyzeEventContext(eventContext), [eventContext]);
  const primaryEventCandidate = useMemo(() => pickPrimaryEventCandidate(eventContext), [eventContext]);

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
          "group relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-[0.7rem] font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          isActive
            ? `border-transparent bg-slate-900/80 shadow-[0_18px_35px_rgba(2,6,23,0.65)] ring-2 ${palette.activeRingClass} ring-offset-2 ring-offset-slate-950`
            : "border-slate-800/70 bg-slate-900/30 shadow-[0_10px_25px_rgba(2,6,23,0.45)] hover:border-slate-600/60 hover:bg-slate-900/55 hover:shadow-[0_18px_32px_rgba(2,6,23,0.55)]",
        )}
      >
        {isActive ? (
          <span className="absolute -top-2 h-1 w-8 rounded-full bg-white/60" aria-hidden="true" />
        ) : null}
        <SmallGauge
          value={ring.value}
          label=""
          tone={ring.tone}
          tooltip={ring.tooltip}
          fillColor={palette.gaugeColor}
          tooltipClassName={
            ring.tooltip
              ? "min-w-[16rem] max-w-[22rem] whitespace-normal text-left text-sm leading-relaxed"
              : undefined
          }
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

  const signalGradeLabel = t("perception.signalQuality.gradeLabel").replace("{grade}", signalQuality.grade);

  const signalSummaryLabel = t("perception.signalQuality.scoreHint").replace(

    "{score}",

    String(Math.round(signalQuality.score)),

  );

  const consistencyLevel = deriveConsistencyLevel(confidenceScore);

  const eventRiskLevel = deriveEventRiskLevel(rings.eventScore);

  const confidenceBullets = [

    t(`perception.confidence.bullets.consistency.${consistencyLevel}`),

    t(`perception.confidence.bullets.eventRisk.${eventRiskLevel}`),

  ];

  const confidenceAdjustmentLine = useMemo(() => {
    if (!eventInsights.riskKey) return null;
    return t(`events.adjustment.${eventInsights.riskKey}`);
  }, [eventInsights.riskKey, t]);

  const signalPalette = getSignalQualityGaugePalette(signalQuality.score);

  const confidencePalette = getConfidenceGaugePalette(confidenceScore);

  const generatedTimestamp = generatedAt ?? setup.snapshotCreatedAt ?? null;

  const generatedAtText = useMemo(

    () => formatGeneratedAtLabel(generatedTimestamp, locale, t),

    [generatedTimestamp, locale, t],

  );

  const entryDescriptor = useMemo(

    () => formatEntryDescriptor(setup.entryZone, numberFormatter),

    [setup.entryZone, numberFormatter],

  );

  const stopInfo = useMemo(

    () => formatPriceValue(setup.stopLoss, numberFormatter),

    [setup.stopLoss, numberFormatter],

  );

  const takeProfitInfo = useMemo(

    () => formatPriceValue(setup.takeProfit, numberFormatter),

    [setup.takeProfit, numberFormatter],

  );

  const stopNoteKey = deriveStopNoteKey(setup.levelDebug);

  const copyLabels = {

    copy: t("setups.action.copy"),

    copied: t("setups.action.copied"),

  };

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

                {headline} Â· {setup.timeframe}

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

        <div className="grid gap-4 lg:grid-cols-2">

          <SignalInsightCard

            title={t("perception.signalQuality.label")}

            summary={signalSummaryLabel}

            gaugeLabel={signalGradeLabel}

            gaugeValue={signalQuality.score}

            gaugePalette={signalPalette}

            bullets={signalQualityReasons.map((reason) => t(reason))}

            description={t("perception.signalQuality.description")}

          />

          <SignalInsightCard

            title={t("perception.today.confidenceLabel")}

            summary={confidenceSummaryLabel}

            gaugeLabel={t("perception.today.confidenceLabel")}

            gaugeValue={confidenceScore}

            gaugePalette={confidencePalette}

            bullets={confidenceBullets}

            description={t("perception.confidence.description")}
            footerText={confidenceAdjustmentLine}

          />

        </div>



        <div className="rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5 shadow-[0_18px_45px_rgba(2,6,23,0.6)]">
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
              "relative mt-4 overflow-hidden rounded-2xl bg-slate-950/20 px-3 py-4 transition-all duration-300",
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
              frameClassName={null}
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

        <div className="grid gap-3 sm:grid-cols-3">

          <ActionLevelCard

            label={t("setups.entry")}

            value={entryDescriptor.display}

            note={t(entryDescriptor.noteKey)}

            tone="neutral"

            copyValue={entryDescriptor.copyValue}

            copyLabels={copyLabels}

          />

          <ActionLevelCard

            label={t("setups.stopLoss")}

            value={stopInfo.display}

            note={t(stopNoteKey)}

            tone="danger"

            copyValue={stopInfo.copyValue}

            copyLabels={copyLabels}

          />

          <ActionLevelCard

            label={t("setups.takeProfit")}

            value={takeProfitInfo.display}

            note={t("setups.takeProfit.note.primary")}

            tone="success"

            copyValue={takeProfitInfo.copyValue}

            copyLabels={copyLabels}

          />

        </div>



        <RiskRewardBlock riskReward={setup.riskReward ?? null} />



        <ExecutionPanel
          setup={setup as unknown as Setup}
          eventInsights={eventInsights}
          primaryEvent={primaryEventCandidate}
        />

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



type CopyLabels = {

  copy: string;

  copied: string;

};



type ActionLevelCardProps = {

  label: string;

  value: string;

  note: string;

  tone?: "neutral" | "danger" | "success";

  copyValue?: string | null;

  copyLabels: CopyLabels;

};



const actionToneStyles: Record<NonNullable<ActionLevelCardProps["tone"]>, string> = {

  neutral: "border-slate-800 bg-[#0f172a]/80",

  danger: "border-rose-500/40 bg-rose-500/10",

  success: "border-emerald-500/40 bg-emerald-500/10",

};



const actionToneValue: Record<NonNullable<ActionLevelCardProps["tone"]>, string> = {

  neutral: "text-slate-100",

  danger: "text-rose-200",

  success: "text-emerald-200",

};



function ActionLevelCard({

  label,

  value,

  note,

  tone = "neutral",

  copyValue,

  copyLabels,

}: ActionLevelCardProps): JSX.Element {

  return (

    <div

      className={clsx(

        "rounded-2xl border px-4 py-3 shadow-[0_20px_45px_rgba(2,6,23,0.45)] transition",

        actionToneStyles[tone],

      )}

    >

      <div className="flex items-start justify-between gap-2">

        <div>

          <p className="text-[0.58rem] uppercase tracking-[0.3em] text-slate-400">{label}</p>

          <p className={clsx("mt-1 text-lg font-semibold", actionToneValue[tone])}>{value}</p>

        </div>

        <CopyValueButton value={copyValue} labels={copyLabels} />

      </div>

      <p className="mt-2 text-xs text-slate-400">{note}</p>

    </div>

  );

}



type CopyButtonProps = {

  value?: string | null;

  labels: CopyLabels;

};



function CopyValueButton({ value, labels }: CopyButtonProps): JSX.Element | null {

  const [copied, setCopied] = useState(false);

  if (!value || value === "n/a") {

    return null;

  }



  const handleCopy = async (): Promise<void> => {

    if (typeof navigator === "undefined" || !navigator.clipboard) {

      return;

    }

    try {

      await navigator.clipboard.writeText(value);

      setCopied(true);

      setTimeout(() => setCopied(false), 1500);

    } catch (error) {

      console.warn("copy-failed", error);

    }

  };



  return (

    <button

      type="button"

      onClick={handleCopy}

      className="inline-flex items-center gap-1 rounded-full border border-slate-700/60 px-2 py-[0.1rem] text-[0.55rem] uppercase tracking-[0.2em] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"

    >

      <Copy className="h-3 w-3" />

      {copied ? labels.copied : labels.copy}

    </button>

  );

}



type ExecutionPanelProps = {

  setup: Setup;
  eventInsights?: EventContextInsights;
  primaryEvent?: PrimaryEventCandidate | null;

};



function ExecutionPanel({ setup, eventInsights, primaryEvent }: ExecutionPanelProps): JSX.Element {

  const t = useT();

  const signal = classifyTradeSignal(setup);

  const rings = setup.rings;

  const confidenceScore = rings.confidenceScore ?? setup.confidence ?? 0;

  const confidenceBucket = deriveConsistencyLevel(confidenceScore);

  const eventScore = rings.eventScore ?? setup.eventScore ?? 0;

  const eventLevel = eventScore >= 75 ? "high" : eventScore >= 40 ? "medium" : "low";

  const mergedEventInsights = eventInsights ?? analyzeEventContext(setup.eventContext ?? null);

  const mergedPrimaryEvent = primaryEvent ?? pickPrimaryEventCandidate(setup.eventContext ?? null);

  const eventTimingHint = deriveEventTimingHint(mergedEventInsights, mergedPrimaryEvent, t);

  const sizingKey = mapSignalToSizing(signal);

  const chips = [

    t("perception.execution.chip.confidence").replace("{value}", String(Math.round(confidenceScore))),

    t(`perception.execution.chip.event.${eventLevel}`),

    t(`perception.execution.chip.sizing.${sizingKey}`),

  ];

  const bullets = [

    t(`perception.execution.bullets.sizing.${sizingKey}`),

    eventTimingHint ?? t(`perception.execution.bullets.event.${eventLevel}`),

    t(`perception.execution.bullets.focus.${deriveFocusKey(rings)}`),

  ];



  return (

    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]">

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

        <div>

          <p className="text-[0.58rem] uppercase tracking-[0.3em] text-slate-400">

            {t("perception.execution.title")}

          </p>

          <p className="text-lg font-semibold text-white">

            {t(`perception.tradeDecision.signal.${signal}.label`)}

          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          {chips.map((chip) => (

            <span

              key={chip}

              className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-200"

            >

              {chip}

            </span>

          ))}

        </div>

      </div>

      <ul className="mt-3 grid gap-2 text-sm text-slate-200 md:grid-cols-2">

        {bullets.map((line) => (

          <li key={line} className="flex items-start gap-2">

            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />

            <span>{line}</span>

          </li>

        ))}

      </ul>

    </div>

  );

}



type ExecutionSignal = ReturnType<typeof classifyTradeSignal>;



function deriveFocusKey(rings: Setup["rings"]): "trendBias" | "flow" | "sentiment" | "structure" {

  const trend = rings.trendScore ?? 0;

  const bias = rings.biasScore ?? 0;

  const flow = rings.orderflowScore ?? 0;

  const sentiment = rings.sentimentScore ?? 0;

  if (trend >= 65 && bias >= 65) return "trendBias";

  if (flow >= 65) return "flow";

  if (sentiment >= 65) return "sentiment";

  return "structure";

}



function mapSignalToSizing(signal: ExecutionSignal): "strong" | "core" | "cautious" | "noEdge" {

  if (signal === "strongLong" || signal === "strongShort") {

    return "strong";

  }

  if (signal === "coreLong" || signal === "coreShort") {

    return "core";

  }

  if (signal === "cautious") {

    return "cautious";

  }

  return "noEdge";

}



function deriveEventTimingHint(
  insights: EventContextInsights,
  primaryEvent: PrimaryEventCandidate | null,
  t: (key: string) => string,
): string | null {
  if (insights.hasFallback || insights.riskKey === "unknown") {
    return t("events.execution.unknown");
  }
  if (insights.riskKey === "highSoon") {
    const minutes = normalizeExecutionMinutes(primaryEvent?.timeToEventMinutes ?? null);
    const eventLabel =
      primaryEvent?.title && primaryEvent.title.trim().length > 0
        ? primaryEvent.title
        : t("events.execution.defaultEvent");
    return t("events.execution.highSoon")
      .replace("{minutes}", String(minutes))
      .replace("{event}", eventLabel);
  }
  if (insights.riskKey === "elevated") {
    return t("events.execution.elevated");
  }
  if (insights.riskKey === "calm") {
    return t("events.execution.calm");
  }
  return null;
}



function normalizeExecutionMinutes(minutes: number | null): number {
  if (minutes === null || !Number.isFinite(minutes)) {
    return 30;
  }
  const absMinutes = Math.abs(minutes);
  if (absMinutes <= 15) return 15;
  if (absMinutes <= 30) return 30;
  if (absMinutes <= 60) return 60;
  return 60;
}



type SignalInsightCardProps = {

  title: string;

  summary: string;

  gaugeLabel: string;

  gaugeValue: number;

  gaugePalette: GaugePalette;

  bullets: string[];

  description: string;

  footerText?: string | null;

};



function SignalInsightCard({

  title,

  summary,

  gaugeLabel,

  gaugeValue,

  gaugePalette,

  bullets,

  description,

  footerText,

}: SignalInsightCardProps): JSX.Element {

  return (

    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_20px_45px_rgba(2,6,23,0.55)]">

      <div className="flex flex-wrap items-end justify-between gap-2">

        <div>

          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.35em] text-slate-300">{title}</p>

          <p className="text-xs text-slate-400">{summary}</p>

        </div>

      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex justify-center md:block md:min-w-[10rem]">
          <BigGauge value={gaugeValue} label={gaugeLabel} palette={gaugePalette} />
        </div>
        <div className="flex-1 space-y-2">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 md:min-h-[150px]">
            <ul className="space-y-1 text-sm leading-snug text-slate-100">
              {bullets.map((line, index) => (
                <li key={`${line}-${index}`} className="flex items-start gap-2 leading-snug">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span className="flex-1">{line}</span>
                </li>
              ))}

            </ul>

          </div>

        </div>

      </div>

      <p className="text-xs text-slate-400 line-clamp-3">{description}</p>

      {footerText ? <p className="text-xs text-slate-400">{footerText}</p> : null}

    </div>

  );

}


