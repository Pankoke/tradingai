"use client";

import type { JSX } from "react";
import clsx from "clsx";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { RingInspectorLayout } from "@/src/components/perception/RingInspectorLayout";
import type { RingInspectorBaseProps } from "@/src/components/perception/RingInspectorTypes";
import type { Setup } from "@/src/lib/engine/types";

const bucketFromScore = (score: number): "low" | "medium" | "high" => {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
};

type TopEvent = NonNullable<
  NonNullable<NonNullable<Setup["eventContext"]>["topEvents"]>[number]
>;

const normalizeSeverity = (severity?: string | null) => {
  const normalized = (severity ?? "medium").toLowerCase();
  if (normalized === "high" || normalized === "low") {
    return normalized;
  }
  return "medium";
};

const formatTiming = (iso: string, t: (key: string) => string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return t("perception.rings.insights.event.noTime");
  }
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const hours = Math.max(1, Math.round(Math.abs(diffMs) / (1000 * 60 * 60)));
  if (diffMs >= 0) {
    return t("perception.rings.insights.event.inHours").replace("{hours}", String(hours));
  }
  return t("perception.rings.insights.event.hoursAgo").replace("{hours}", String(hours));
};

const NOTE_TRANSLATIONS: Record<string, string> = {
  high_impact_soon: "perception.event.notes.highImpactSoon",
  clustered_events: "perception.event.notes.clusteredEvents",
  no_relevant_events: "perception.event.notes.calmWindowLabel",
  hash_fallback: "perception.event.notes.hashFallback",
  events_db_unavailable: "perception.event.notes.eventsDbUnavailable",
  events_table_missing: "perception.event.notes.eventsTableMissing",
};

const WINDOW_KIND_MAP: Record<string, string> = {
  intraday: "perception.event.window.kind.intraday",
  daily: "perception.event.window.kind.daily",
  swing: "perception.event.window.kind.swing",
  unknown: "perception.event.window.kind.unknown",
};

const DEFAULT_LOCALE = typeof navigator !== "undefined" ? navigator.language : "en-US";

const berlinFormatter = (options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Berlin",
    ...options,
  });

const formatWindowPoint = (iso?: string): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return berlinFormatter().format(date);
};

const formatTimeToEvent = (event: TopEvent, t: (key: string) => string): string => {
  if (typeof event.timeToEventMinutes === "number" && Number.isFinite(event.timeToEventMinutes)) {
    const mins = Math.abs(event.timeToEventMinutes);
    if (event.timeToEventMinutes >= 0) {
      return t("perception.event.timeToEvent.future").replace("{minutes}", String(mins));
    }
    return t("perception.event.timeToEvent.past").replace("{minutes}", String(mins));
  }
  return event.scheduledAt ? formatTiming(event.scheduledAt, t) : t("perception.rings.insights.event.noTime");
};

const impactTone = (impact?: number) => {
  if (impact === 3) return "danger";
  if (impact === 2) return "warn";
  return "neutral";
};

export type EventInspectorProps = RingInspectorBaseProps;

export function EventInspector({
  setup,
  variant = "full",
  className,
}: EventInspectorProps): JSX.Element {
  const t = useT();
  const score = setup.rings?.eventScore;
  const rawEvents = setup.eventContext?.topEvents ?? [];
  const events: TopEvent[] = rawEvents.filter(
    (event): event is TopEvent => Boolean(event),
  );
  const eventContext = setup.eventContext ?? null;

  if (score === undefined && events.length === 0) {
    return (
      <RingInspectorLayout
        title={t("perception.event.heading")}
        variant={variant}
        className={className}
        emptyState={t("perception.event.empty")}
      />
    );
  }

  const hasHighEvent = events.some(
    (event) => normalizeSeverity(event.severity) === "high",
  );
  const riskBucket =
    typeof score === "number"
      ? bucketFromScore(score)
      : hasHighEvent
        ? "high"
        : events.length > 0
          ? "medium"
          : "low";
  const summary = t(`perception.event.summary.${riskBucket}`);
  const scoreLabel =
    typeof score === "number" ? `${Math.round(score)} / 100` : undefined;
  const scoreTone =
    riskBucket === "high" ? "danger" : riskBucket === "medium" ? "medium" : "low";

  const bulletItems: string[] = [];
  if (scoreLabel) {
    bulletItems.push(
      t("perception.event.detail.score")
        .replace("{score}", scoreLabel)
        .replace("{bucket}", summary),
    );
  }
  if (events.length > 0) {
    bulletItems.push(
      t("perception.event.detail.count").replace(
        "{count}",
        String(events.length),
      ),
    );
  }
  if (hasHighEvent) {
    bulletItems.push(t("perception.event.detail.highImpact"));
  }
  const detailList =
    variant === "compact" ? bulletItems.slice(0, 1) : bulletItems;

  const limit = variant === "compact" ? 1 : 3;
  const eventsToShow = events.slice(0, limit);
  const list =
    eventsToShow.length > 0 ? (
      <div className="space-y-3">
        {eventsToShow.map((event, index) => {
          const severity = normalizeSeverity(event.severity);
          const severityLabel = t(`perception.eventStrip.impact.${severity}`);
          const timing = formatTimeToEvent(event, t);
          const isHigh = severity === "high";
          const impactClass = impactTone(event.impact);
          return (
            <div
              key={event.id ?? `${event.title ?? "event"}-${index}`}
              className={`rounded-lg border p-3 ${
                isHigh
                  ? "border-rose-500/70 bg-rose-500/5"
                  : "border-slate-800/60 bg-slate-900/60"
              }`}
            >
              <p className="text-sm font-semibold text-slate-100">
                {event.title ?? t("perception.event.untitled")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <span>{severityLabel}</span>
                <span>·</span>
                <span>{timing}</span>
                {typeof event.impact === "number" && (
                  <span
                    className={clsx(
                      "rounded-full border px-2 py-0.5 normal-case tracking-wide",
                      impactClass === "danger"
                        ? "border-rose-500/50 text-rose-200"
                        : impactClass === "warn"
                          ? "border-amber-500/40 text-amber-200"
                          : "border-slate-600 text-slate-300",
                    )}
                  >
                    {t("perception.event.impactBadge").replace("{impact}", String(event.impact))}
                  </span>
                )}
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {event.scheduledAt
                  ? berlinFormatter({ hour: "2-digit", minute: "2-digit" }).format(new Date(event.scheduledAt))
                  : t("perception.rings.insights.event.noTime")}
              </p>
              {event.category && (
                <p className="text-xs text-slate-500">{event.category}</p>
              )}
            </div>
          );
        })}
      </div>
    ) : null;

  return (
    <RingInspectorLayout
      title={t("perception.event.heading")}
      scoreLabel={scoreLabel}
      scoreTone={scoreTone}
      summary={summary}
      variant={variant}
      className={className}
      emptyState={t("perception.event.empty")}
    >
      <div className="space-y-4">
        {detailList.length > 0 && (
          <ul className="space-y-1 text-sm text-slate-200">
            {detailList.map((item, idx) => (
              <li key={`${item}-${idx}`} className="flex gap-2">
                <span className="text-emerald-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        {eventContext ? (
          <WhyBlock eventContext={eventContext} t={t} />
        ) : null}
        {list}
      </div>
    </RingInspectorLayout>
  );
}

function WhyBlock({
  eventContext,
  t,
}: {
  eventContext: NonNullable<Setup["eventContext"]>;
  t: (key: string) => string;
}): JSX.Element {
  const notes = (eventContext.notes ?? []).filter(Boolean);
  const hasHashFallback = notes.includes("hash_fallback");
  const hasDbFallback =
    notes.includes("events_db_unavailable") || notes.includes("events_table_missing");
  const filteredNotes = notes.filter((note) => note !== "hash_fallback");
  const windowLabelKey = eventContext.windowKind
    ? WINDOW_KIND_MAP[eventContext.windowKind] ?? WINDOW_KIND_MAP.unknown
    : WINDOW_KIND_MAP.unknown;
  const windowKindLabel = t(windowLabelKey);
  const fromLabel = formatWindowPoint(eventContext.windowFrom);
  const toLabel = formatWindowPoint(eventContext.windowTo);
  const hasCalmWindow = notes.includes("no_relevant_events") && !hasHashFallback && !hasDbFallback;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-sm text-slate-200">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
        {t("perception.event.why.heading")}
      </p>
      <dl className="mt-2 space-y-1">
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">{t("perception.event.windowLabel")}:</span>
          <span>
            {windowKindLabel}
            {fromLabel && toLabel ? ` · ${fromLabel} → ${toLabel}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">
            {t("perception.event.eventsInWindowLabel")}:
          </span>
          <span>{eventContext.eventCount ?? 0}</span>
        </div>
      </dl>
      {filteredNotes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {filteredNotes.map((note) => {
            const key = NOTE_TRANSLATIONS[note];
            if (!key) return null;
            return (
              <span
                key={note}
                className="rounded-full border border-slate-600/70 px-2 py-0.5 text-xs text-slate-300"
              >
                {t(key)}
              </span>
            );
          })}
        </div>
      )}
      {hasHashFallback ? (
        <p className="mt-2 text-xs text-amber-300">
          {t("perception.event.notes.hashFallbackHint")}
        </p>
      ) : null}
      {hasCalmWindow ? (
        <p className="mt-2 text-xs text-slate-300">
          {t("perception.event.notes.calmWindowHelp")}
        </p>
      ) : null}
      {eventContext.topEvents && eventContext.topEvents.length > 0 ? (
        <div className="mt-3 space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {t("perception.event.topEventsLabel")}
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            {eventContext.topEvents.slice(0, 3).map((event, index) => (
              <li key={`${event.title ?? "event"}-${index}`}>
                <span className="text-slate-100">{event.title ?? t("perception.event.untitled")}</span>{" "}
                · {formatTimeToEvent(event as TopEvent, t)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
