"use client";

import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../../../../lib/i18n/ClientProvider";
import type { SetupCardSetup } from "./SetupCard";
import { i18nConfig, type Locale } from "../../../../lib/i18n/config";
import { LevelDebugBlock } from "@/src/components/perception/LevelDebugBlock";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import { BigGauge, SmallGauge } from "@/src/components/perception/RingGauges";
import { formatNumberText, formatRangeText } from "@/src/lib/formatters/levels";
import { RiskRewardBlock } from "@/src/components/perception/RiskRewardBlock";
import { buildEventTooltip } from "@/src/features/perception/ui/eventTooltip";
import { RingInsights } from "@/src/components/perception/RingInsights";
import { PrimaryTradeSignal } from "@/src/components/perception/PrimaryTradeSignal";
import { TraderPlaybook } from "@/src/components/perception/TraderPlaybook";
import { PositioningGuide } from "@/src/components/perception/PositioningGuide";
import { TraderContextOverlay } from "@/src/components/perception/TraderContextOverlay";
import { EventMicroTimingStrip } from "@/src/components/perception/EventMicroTimingStrip";
import { TraderImpactSummary } from "@/src/components/perception/TraderImpactSummary";
import type { Setup } from "@/src/lib/engine/types";
import { TraderNarrativeBlock } from "@/src/components/perception/TraderNarrativeBlock";
import { SetupRatingBlock } from "@/src/components/perception/SetupRatingBlock";
import { ScoreBreakdownChart } from "@/src/components/perception/ScoreBreakdownChart";
import { SetupLayoutFrame } from "@/src/components/perception/SetupLayoutFrame";

type SetupOfTheDayCardProps = {
  setup: SetupCardSetup;
};

type LevelBoxPropsDay = {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "success";
};

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

export function SetupOfTheDayCard({ setup }: SetupOfTheDayCardProps): JSX.Element {
  const t = useT();
  const isLong = setup.direction === "Long";
  const pathname = usePathname();
  const prefix = useMemo(() => localePrefix(pathname), [pathname]);
  const meta = getAssetMeta(setup.assetId, setup.symbol);
  const headline = formatAssetLabel(setup.assetId, setup.symbol);
  const rings = setup.rings;
  const assetLabel = formatAssetLabel(setup.assetId, setup.symbol);
  const compactRings = [
    {
      label: t("perception.today.scoreTrend"),
      value: rings.trendScore,
      tone: "teal" as const,
      tooltip: t("perception.rings.tooltip.trend"),
    },
    {
      label: t("perception.today.eventRing"),
      value: rings.eventScore,
      tone: "accent" as const,
      tooltip: buildEventTooltip(t("perception.rings.tooltip.event"), setup.eventContext, t),
    },
    {
      label: t("perception.today.biasRing"),
      value: rings.biasScore,
      tone: "green" as const,
      tooltip: t("perception.rings.tooltip.bias"),
    },
    {
      label: t("perception.today.sentimentRing"),
      value: rings.sentimentScore,
      tone: "teal" as const,
      tooltip: t("perception.rings.tooltip.sentiment"),
    },
    {
      label: t("perception.today.orderflowRing"),
      value: rings.orderflowScore,
      tone: "accent" as const,
      tooltip: t("perception.rings.tooltip.orderflow"),
    },
  ];

  const [showNarrative, setShowNarrative] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showImpact, setShowImpact] = useState(false);

  const decisionContent = (
    <>
        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-2">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.35em] text-slate-300">
              {t("setups.setupOfTheDay")}
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {headline} · {setup.timeframe}
            </h2>
            <p className={`text-4xl font-bold ${isLong ? "text-emerald-400" : "text-rose-400"}`}>
              {setup.direction}
            </p>
            <p className="text-sm text-slate-400">{meta.name}</p>
            <span className="inline-flex w-fit rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
              {setup.type === "Regelbasiert" ? t("setups.type.ruleBased") : t("setups.type.ai")}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3 sm:items-center lg:mt-0 lg:w-64 lg:items-end">
          <BigGauge
            value={rings.confidenceScore}
            label={t("perception.today.confidenceRing")}
            tooltip={t("perception.rings.tooltip.confidence")}
          />
        </div>
      </div>

        <div className="grid grid-cols-2 gap-3 text-[0.65rem] sm:grid-cols-3 lg:grid-cols-5">
          {compactRings.map((ring) => (
            <SmallGauge key={ring.label} label={ring.label} value={ring.value} tone={ring.tone} tooltip={ring.tooltip} />
          ))}
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
          <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
            {t("perception.setup.sections.driversOverview")}
          </h3>
          <ScoreBreakdownChart setup={setup as unknown as Setup} />
          <div className="h-px bg-slate-800/40" />
          <div className="space-y-4">
            <RingInsights
              rings={rings}
              assetLabel={assetLabel}
              timeframe={setup.timeframe}
              direction={setup.direction}
              ringAiSummary={setup.ringAiSummary ?? null}
              eventContext={setup.eventContext ?? undefined}
            />
          </div>
        </div>

        <div className="space-y-4 pt-3">
          <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
            {t("perception.setup.sections.playbook")}
          </h3>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]">
            <TraderPlaybook setup={setup} />
          </div>
        </div>
    </>
  );

  const detailsContent = (
    <>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
            {t("perception.setup.sections.context")}
          </h3>
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

        {setup.ringAiSummary && (
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold tracking-wide text-slate-300/90">
                  {t("perception.setup.sections.aiSummary")}
                </h3>
                <button
                  type="button"
                  className="w-full text-left text-sm font-medium text-slate-200 transition hover:text-white sm:w-auto"
                  onClick={() => setShowAi((prev) => !prev)}
                >
                  {showAi ? t("perception.setup.details.hideAi") : t("perception.setup.details.showAi")}
                </button>
              </div>
              <p className="text-xs text-slate-400">{t("perception.setup.sections.aiHint")}</p>
            </div>
            {showAi && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-200 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)] transition-all duration-300 ease-in-out">
                {setup.ringAiSummary.longSummary ?? setup.ringAiSummary.shortSummary ?? ""}
              </div>
            )}
          </div>
        )}

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

  return (
    <SetupLayoutFrame decision={decisionContent} drivers={driversContent} details={detailsContent} header={null} />
  );
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
