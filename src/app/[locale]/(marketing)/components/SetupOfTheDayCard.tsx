"use client";

import React, { useMemo } from "react";
import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../../../../lib/i18n/ClientProvider";
import type { SetupCardSetup } from "./SetupCard";
import { i18nConfig, type Locale } from "../../../../lib/i18n/config";
import { PerceptionCard } from "@/src/components/perception/PerceptionCard";
import { LevelDebugBlock } from "@/src/components/perception/LevelDebugBlock";
import { formatAssetLabel, getAssetMeta } from "@/src/lib/formatters/asset";
import { BigGauge, SmallGauge } from "@/src/components/perception/RingGauges";
import { formatNumberText, formatRangeText } from "@/src/lib/formatters/levels";
import { RiskRewardBlock } from "@/src/components/perception/RiskRewardBlock";
import { buildEventTooltip } from "@/src/features/perception/ui/eventTooltip";
import { RingInsights } from "@/src/components/perception/RingInsights";

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

  return (
    <PerceptionCard className="p-0" innerClassName="p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.35em] text-slate-300">
              {t("setups.setupOfTheDay")}
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {headline} · {setup.timeframe}
            </h2>
            <p className={`text-3xl font-bold ${isLong ? "text-emerald-400" : "text-rose-400"}`}>
              {setup.direction}
            </p>
            <p className="text-sm text-slate-400">{meta.name}</p>
            <span className="inline-flex w-fit rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
              {setup.type === "Regelbasiert" ? t("setups.type.ruleBased") : t("setups.type.ai")}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3 lg:mt-0 lg:w-64 lg:items-end">
          <BigGauge
            value={rings.confidenceScore}
            label={t("perception.today.confidenceRing")}
            tooltip={t("perception.rings.tooltip.confidence")}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 text-[0.65rem] sm:grid-cols-2 lg:grid-cols-5">
        {compactRings.map((ring) => (
          <SmallGauge key={ring.label} label={ring.label} value={ring.value} tone={ring.tone} tooltip={ring.tooltip} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 text-xs sm:grid-cols-3">
        <LevelBox label={t("setups.entry")} value={formatRangeText(setup.entryZone)} tone="neutral" />
        <LevelBox label={t("setups.stopLoss")} value={formatNumberText(setup.stopLoss)} tone="danger" />
        <LevelBox label={t("setups.takeProfit")} value={formatNumberText(setup.takeProfit)} tone="success" />
      </div>

      <div className="mt-4">
        <RiskRewardBlock riskReward={setup.riskReward ?? null} />
      </div>

          <RingInsights
            rings={rings}
            assetLabel={assetLabel}
            timeframe={setup.timeframe}
            direction={setup.direction}
            ringAiSummary={setup.ringAiSummary ?? null}
            eventContext={setup.eventContext ?? null}
          />

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

      <div className="mt-4 flex justify-end">
        <Link
          href={`${prefix}/setups/${setup.id}`}
          className="rounded-full bg-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition hover:brightness-110"
        >
          {t("setups.openAnalysis")}
        </Link>
      </div>
    </PerceptionCard>
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
