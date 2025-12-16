"use client";

import { Tooltip } from "@/src/components/ui/tooltip";
import type { JSX, ReactNode } from "react";
import clsx from "clsx";
import type { RingMeta, RingQuality } from "@/src/lib/engine/types";

type GaugeTone = "accent" | "green" | "teal" | "neutral";

const QUALITY_DESCRIPTORS: Record<RingQuality, { label: string; tone: GaugeTone; description: string }> = {
  live: { label: "LIVE", tone: "green", description: "Based on live data" },
  derived: { label: "DER", tone: "accent", description: "Derived from other signals" },
  fallback: { label: "FB", tone: "neutral", description: "Fallback value due to missing data" },
  heuristic: { label: "HEUR", tone: "teal", description: "Heuristic or hash-based value" },
  stale: { label: "STALE", tone: "neutral", description: "Underlying data is stale" },
  unknown: { label: "UNK", tone: "neutral", description: "Quality unknown" },
};

const NOTE_MESSAGES: Record<string, string> = {
  no_events: "No events found during build window",
  mock_mode: "Snapshot built in mock mode",
  no_bias_snapshot: "Bias snapshot missing",
  hash_fallback: "Randomized sentiment fallback",
  no_intraday_candles: "No intraday candle data",
  stale_signal: "Market metrics stale",
  no_market_data: "Market data unavailable",
  meta_aggregate: "Confidence derived from other rings",
};

const badgeTone: Record<GaugeTone, string> = {
  accent: "bg-sky-500/20 text-sky-200 border-sky-400/60",
  green: "bg-emerald-500/20 text-emerald-200 border-emerald-400/60",
  teal: "bg-teal-500/20 text-teal-100 border-teal-400/60",
  neutral: "bg-slate-700/60 text-slate-200 border-slate-500",
};

export type GaugePalette = {
  primary: string;
  secondary: string;
  border: string;
};

const DEFAULT_PALETTE: GaugePalette = {
  primary: "#22c55e",
  secondary: "rgba(226,232,240,0.15)",
  border: "rgba(34,197,94,0.5)",
};

const NEUTRAL_SECONDARY = "rgba(226,232,240,0.15)";

const SIGNAL_PALETTES: Array<{ min: number; palette: GaugePalette }> = [
  { min: 75, palette: { primary: "#22c55e", secondary: NEUTRAL_SECONDARY, border: "rgba(16,185,129,0.6)" } },
  { min: 60, palette: { primary: "#a3e635", secondary: NEUTRAL_SECONDARY, border: "rgba(132,204,22,0.6)" } },
  { min: 45, palette: { primary: "#f97316", secondary: NEUTRAL_SECONDARY, border: "rgba(249,115,22,0.6)" } },
  { min: 30, palette: { primary: "#fb923c", secondary: NEUTRAL_SECONDARY, border: "rgba(251,146,60,0.6)" } },
  { min: 0, palette: { primary: "#ef4444", secondary: NEUTRAL_SECONDARY, border: "rgba(239,68,68,0.6)" } },
];

const CONFIDENCE_PALETTES: Array<{ min: number; palette: GaugePalette }> = [
  { min: 75, palette: { primary: "#38bdf8", secondary: NEUTRAL_SECONDARY, border: "rgba(14,165,233,0.6)" } },
  { min: 60, palette: { primary: "#0ea5e9", secondary: NEUTRAL_SECONDARY, border: "rgba(14,165,233,0.6)" } },
  { min: 45, palette: { primary: "#60a5fa", secondary: NEUTRAL_SECONDARY, border: "rgba(59,130,246,0.6)" } },
  { min: 30, palette: { primary: "#94a3b8", secondary: NEUTRAL_SECONDARY, border: "rgba(148,163,184,0.6)" } },
  { min: 0, palette: { primary: "#475569", secondary: NEUTRAL_SECONDARY, border: "rgba(71,85,105,0.7)" } },
];

export function getSignalQualityGaugePalette(score: number): GaugePalette {
  const normalized = Math.max(0, Math.min(100, score));
  return SIGNAL_PALETTES.find((entry) => normalized >= entry.min)?.palette ?? DEFAULT_PALETTE;
}

export function getConfidenceGaugePalette(score: number): GaugePalette {
  const normalized = Math.max(0, Math.min(100, score));
  return CONFIDENCE_PALETTES.find((entry) => normalized >= entry.min)?.palette ?? DEFAULT_PALETTE;
}

export function summarizeRingMeta(meta?: RingMeta):
  | { label: string; tone: GaugeTone; lines: string[] }
  | null {
  if (!meta) return null;
  const descriptor = QUALITY_DESCRIPTORS[meta.quality] ?? QUALITY_DESCRIPTORS.unknown;
  const lines: string[] = [descriptor.description];
  if (meta.timeframe && meta.timeframe !== "unknown") {
    lines.push(`Timeframe: ${meta.timeframe}`);
  }
  if (meta.asOf) {
    const dt = new Date(meta.asOf);
    lines.push(`As of: ${dt.toLocaleString()}`);
  }
  if (meta.notes?.length) {
    const mapped = meta.notes
      .map((note) => NOTE_MESSAGES[note] ?? note)
      .filter(Boolean);
    lines.push(...mapped);
  }
  return { label: descriptor.label, tone: descriptor.tone, lines };
}

function mergeTooltipContent(
  first?: ReactNode,
  metaSummary?: ReturnType<typeof summarizeRingMeta>,
): ReactNode | undefined {
  if (!metaSummary && !first) {
    return undefined;
  }
  const metaContent =
    metaSummary && metaSummary.lines.length
      ? (
        <div className="text-xs text-slate-200">
          {metaSummary.lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )
      : null;
  if (!first) return metaContent ?? undefined;
  return (
    <div className="space-y-2">
      <div>{first}</div>
      {metaContent}
    </div>
  );
}

export type SmallGaugeProps = {
  label?: string;
  value: number;
  tone?: GaugeTone;
  tooltip?: ReactNode;
  tooltipClassName?: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  meta?: RingMeta;
  fillColor?: string;
};

export function SmallGauge({
  label,
  value,
  tone = "accent",
  tooltip,
  tooltipClassName,
  isActive = false,
  onClick,
  className,
  meta,
  fillColor,
}: SmallGaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  const display = Math.round(clamped);
  const metaSummary = summarizeRingMeta(meta);
  const combinedTooltip = mergeTooltipContent(tooltip, metaSummary);
  const toneColor =
    fillColor ??
    (tone === "green" ? "#22c55e" : tone === "teal" ? "#14b8a6" : tone === "neutral" ? "#475569" : "#0ea5e9");

  const gaugeInner = (
    <>
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${toneColor} ${clamped}%, rgba(226,232,240,0.15) ${clamped}% 100%)`,
        }}
      >
        <div className="flex h-[68%] w-[68%] items-center justify-center rounded-full bg-slate-900">
          <span className="text-xs font-semibold text-white">{display}%</span>
        </div>
      </div>
      {label ? <span className="text-[0.7rem] text-slate-300">{label}</span> : null}
    </>
  );

  const content = (
    <div
      className={clsx(
        "flex flex-col items-center gap-2 rounded-2xl border border-transparent px-2 py-2 transition duration-300 ease-out transform",
        onClick && "cursor-pointer focus-within:outline-none focus-visible:outline-none",
        isActive &&
          "scale-105 border-sky-500/70 bg-slate-800/60 shadow-[0_10px_30px_rgba(15,23,42,0.4)] ring-1 ring-sky-400/30",
        !isActive &&
          onClick &&
          "hover:border-slate-700/70 hover:bg-slate-800/30 hover:scale-105",
        className,
      )}
    >
      {metaSummary ? (
        <span
          className={clsx(
            "rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide",
            badgeTone[metaSummary.tone],
          )}
        >
          {metaSummary.label}
        </span>
      ) : null}
      {gaugeInner}
    </div>
  );

  const interactive = onClick
    ? (
      <button
        type="button"
        onClick={onClick}
        className="rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        aria-pressed={isActive}
      >
        {content}
      </button>
    )
    : content;

  return combinedTooltip ? (
    <Tooltip content={combinedTooltip} contentClassName={tooltipClassName}>
      {interactive}
    </Tooltip>
  ) : (
    interactive
  );
}

type BigGaugeProps = {
  value: number;
  label?: string;
  tooltip?: string;
  meta?: RingMeta;
  palette?: GaugePalette;
};

export function BigGauge({ value, label, tooltip, meta, palette }: BigGaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  const display = Math.round(clamped);
  const metaSummary = summarizeRingMeta(meta);
  const combinedTooltip = mergeTooltipContent(tooltip ? <div>{tooltip}</div> : undefined, metaSummary);
  const tonePalette = palette ?? DEFAULT_PALETTE;

  const gauge = (
    <div className="flex flex-col items-center gap-2 lg:items-end">
      <div
        className="relative flex h-36 w-36 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${tonePalette.primary} ${clamped}%, ${tonePalette.secondary} ${clamped}% 100%)`,
          border: `1px solid ${tonePalette.border}`,
        }}
      >
        <div className="flex h-[68%] w-[68%] flex-col items-center justify-center rounded-full bg-slate-900 shadow-inner shadow-black/40">
          <span className="text-3xl font-bold text-white">{display}%</span>
          <span className="text-[0.65rem] text-slate-300">{label ?? "Confidence"}</span>
        </div>
      </div>
    </div>
  );

  return combinedTooltip ? <Tooltip content={combinedTooltip}>{gauge}</Tooltip> : gauge;
}
