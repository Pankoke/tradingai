"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";

type Props = {
  title: string;
  bullets: string[];
  debugLines?: string[] | null;
  eventModifier?: {
    classification: "none" | "awareness_only" | "context_relevant" | "execution_critical";
    primaryEvent?: {
      title?: string;
      scheduledAt?: string;
      impact?: number;
      minutesToEvent?: number;
      source?: string;
      country?: string;
      currency?: string;
      category?: string;
    };
    rationale?: string[];
    executionAdjustments?: string[];
  } | null;
};

export function SetupCardExecutionBlock({ title, bullets, debugLines, eventModifier }: Props): JSX.Element {
  const t = useT();
  const [showDetails, setShowDetails] = useState(false);

  const hasModifier =
    eventModifier && eventModifier.classification && eventModifier.classification !== "none";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-1">
        <p className="text-[0.58rem] uppercase tracking-[0.3em] text-slate-400">
          {t("perception.execution.title")}
        </p>
        <p className="text-lg font-semibold text-white">{title}</p>
      </div>
      {hasModifier
        ? renderEventModifier(
            eventModifier as NonNullable<Props["eventModifier"]>,
            showDetails,
            () => setShowDetails((prev) => !prev),
          )
        : renderNoEventFallback(eventModifier ?? null)}
      <ul className="mt-3 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
        {bullets.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {debugLines && debugLines.length > 0 ? (
        <div className="mt-3 space-y-1 text-[11px] text-slate-500">
          {debugLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderEventModifier(
  modifier: NonNullable<Props["eventModifier"]>,
  showDetails: boolean,
  onToggleDetails: () => void,
): JSX.Element | null {
  const label =
    modifier.classification === "execution_critical"
      ? "Execution-critical"
      : modifier.classification === "context_relevant"
        ? "Context relevant"
        : modifier.classification === "awareness_only"
          ? "Awareness"
          : "None";

  const primary = modifier.primaryEvent;
  const timeText =
    typeof primary?.minutesToEvent === "number"
      ? `${primary.minutesToEvent >= 0 ? "in" : ""} ${Math.abs(primary.minutesToEvent)}m`
      : primary?.scheduledAt
        ? new Intl.DateTimeFormat("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Berlin",
          }).format(new Date(primary.scheduledAt))
        : null;
  const primaryText = primary
    ? `${primary.title ?? "Event"}${timeText ? ` (${timeText})` : ""}`
    : "No upcoming event";

  const adjustments = modifier.executionAdjustments ?? [];
  const rationale = modifier.rationale ?? [];
  const reliability =
    modifier.quality?.reliabilityBucket ??
    (modifier.reliabilityWeight !== undefined
      ? modifier.reliabilityWeight >= 0.75
        ? "high"
        : modifier.reliabilityWeight >= 0.5
          ? "med"
          : "low"
      : null);
  const surprise = modifier.surprise;

  if (modifier.classification === "none") {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-900/80 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-300">
        <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[0.65rem] font-semibold">
          Event-Modifier: {label}
        </span>
        {primary?.impact ? (
          <span className="rounded-full border border-amber-500/40 px-2 py-0.5 text-[0.65rem] text-amber-200">
            Impact {primary.impact}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-100">{primaryText}</p>
      {modifier.classification !== "awareness_only" ? (
        <button
          type="button"
          className="mt-2 text-xs text-sky-200 underline decoration-dotted decoration-sky-400/70 underline-offset-4"
          onClick={onToggleDetails}
        >
          {showDetails ? "Details verbergen" : "Details anzeigen"}
        </button>
      ) : null}
      {showDetails && modifier.classification !== "awareness_only" && rationale.length ? (
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {reliability ? (
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span>Reliability: {reliability}</span>
            </li>
          ) : null}
          {surprise ? (
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Surprise: {surprise.label}</span>
            </li>
          ) : null}
          {rationale.slice(0, 3).map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {showDetails && modifier.classification !== "awareness_only" && adjustments.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {adjustments.slice(0, 2).map((token) => (
            <span key={token} className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[0.72rem] text-sky-100">
              {token}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderNoEventFallback(modifier: Props["eventModifier"]): JSX.Element | null {
  const debug = process.env.EVENT_MODIFIER_DEBUG === "1" || process.env.NEXT_PUBLIC_EVENT_MODIFIER_DEBUG === "1";
  if (debug) {
    const label = modifier?.classification ?? "none";
    const title = modifier?.primaryEvent?.title ?? "";
    const mins = modifier?.primaryEvent?.minutesToEvent;
    return (
      <p className="mt-2 text-[11px] text-slate-500">
        EventModifier: {label}
        {title ? ` • ${title}` : ""}{mins !== undefined ? ` (${mins}m)` : ""}
      </p>
    );
  }
  if (!modifier || modifier.classification !== "none") {
    return null;
  }
  return (
    <p className="mt-2 text-[11px] text-slate-500">
      {/** ultra-dezent hint */}Keine relevanten Events im aktuellen Zeitfenster.
    </p>
  );
}
