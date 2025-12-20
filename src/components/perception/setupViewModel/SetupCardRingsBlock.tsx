"use client";

import type { JSX } from "react";
import clsx from "clsx";
import { SmallGauge } from "@/src/components/perception/RingGauges";
import { buildEventTooltip } from "@/src/features/perception/ui/eventTooltip";
import type { RingTabId } from "@/src/components/perception/RingInsightTabs";
import type { SetupViewModel } from "@/src/components/perception/setupViewModel/types";
import { useT } from "@/src/lib/i18n/ClientProvider";

type Props = {
  setup: SetupViewModel;
  activeRing: RingTabId;
  onActiveRingChange: (id: RingTabId) => void;
};

type RingTileDefinition = {
  id: RingTabId;
  labelKey: string;
  value: number;
  tone: "accent" | "green" | "teal";
  tooltip?: React.ReactNode;
  badgeKey?: string | null;
  badgeTooltipKey?: string | null;
};

type RingPalette = {
  activeRingClass: string;
  labelClass: string;
  gaugeColor: string;
};

const RING_PALETTES: Record<RingTileDefinition["tone"], RingPalette> = {
  accent: {
    activeRingClass: "ring-sky-400/70",
    labelClass: "text-sky-200",
    gaugeColor: "#38bdf8",
  },
  green: {
    activeRingClass: "ring-emerald-400/70",
    labelClass: "text-emerald-200",
    gaugeColor: "#22c55e",
  },
  teal: {
    activeRingClass: "ring-teal-400/70",
    labelClass: "text-teal-200",
    gaugeColor: "#14b8a6",
  },
};

function getRingCategoryPalette(tone: RingTileDefinition["tone"]): RingPalette {
  return RING_PALETTES[tone] ?? RING_PALETTES.accent;
}

export function SetupCardRingsBlock({ setup, activeRing, onActiveRingChange }: Props): JSX.Element {
  const t = useT();
  const compactRings: RingTileDefinition[] = [
    {
      id: "trend",
      labelKey: "perception.today.trendRing",
      value: setup.rings.trendScore,
      tone: "teal",
      tooltip: t("perception.rings.tooltip.trend"),
    },
    {
      id: "event",
      labelKey: "perception.today.eventRing",
      value: setup.rings.eventScore,
      tone: "accent",
      tooltip: buildEventTooltip(t("perception.rings.tooltip.event"), setup.eventContext, t),
      badgeKey: eventLevelToBadgeKey(setup.meta.eventLevel),
      badgeTooltipKey: eventLevelToBadgeTooltipKey(setup.meta.eventLevel),
    },
    {
      id: "bias",
      labelKey: "perception.today.biasRing",
      value: setup.rings.biasScore,
      tone: "green",
      tooltip: t("perception.rings.tooltip.bias"),
    },
    {
      id: "sentiment",
      labelKey: "perception.today.sentimentRing",
      value: setup.rings.sentimentScore,
      tone: "teal",
      tooltip: t("perception.rings.tooltip.sentiment"),
    },
    {
      id: "orderflow",
      labelKey: "perception.today.orderflowRing",
      value: setup.rings.orderflowScore,
      tone: "accent",
      tooltip: t("perception.rings.tooltip.orderflow"),
    },
  ];

  return (
    <div className="mt-3 grid gap-3 text-[0.75rem] sm:grid-cols-2 lg:grid-cols-5">
      {compactRings.map((ring) => {
        const palette = getRingCategoryPalette(ring.tone);
        const badgeLabel = ring.badgeKey ? t(ring.badgeKey) : null;
        const badgeTooltip = ring.badgeTooltipKey ? t(ring.badgeTooltipKey) : undefined;
        return (
          <button
            key={ring.id}
            type="button"
            onClick={() => onActiveRingChange(ring.id)}
            aria-pressed={activeRing === ring.id}
            className={clsx(
              "group relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-[0.7rem] font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
              activeRing === ring.id
                ? `border-transparent bg-slate-900/80 shadow-[0_18px_35px_rgba(2,6,23,0.65)] ring-2 ${palette.activeRingClass} ring-offset-2 ring-offset-slate-950`
                : "border-slate-800/70 bg-slate-900/30 shadow-[0_10px_25px_rgba(2,6,23,0.45)] hover:border-slate-600/60 hover:bg-slate-900/55 hover:shadow-[0_18px_32px_rgba(2,6,23,0.55)]",
            )}
          >
            {activeRing === ring.id ? (
              <span className="absolute -top-2 h-1 w-8 rounded-full bg-white/60" aria-hidden="true" />
            ) : null}
            {badgeLabel ? (
              <span
                className="absolute right-3 top-2 rounded-full border border-white/20 bg-slate-900/70 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-slate-200"
                title={badgeTooltip}
              >
                {badgeLabel}
              </span>
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
      })}
    </div>
  );
}

function eventLevelToBadgeKey(
  level: "high" | "medium" | "low" | null | undefined,
): `events.risk.badge.${string}` | null {
  if (!level) return "events.risk.badge.unknown";
  if (level === "high") return "events.risk.badge.highSoon";
  if (level === "medium") return "events.risk.badge.elevated";
  return "events.risk.badge.calm";
}

function eventLevelToBadgeTooltipKey(
  level: "high" | "medium" | "low" | null | undefined,
): `events.risk.badgeTooltip.${string}` | null {
  if (!level) return "events.risk.badgeTooltip.unknown";
  if (level === "high") return "events.risk.badgeTooltip.highSoon";
  if (level === "medium") return "events.risk.badgeTooltip.elevated";
  return "events.risk.badgeTooltip.calm";
}
