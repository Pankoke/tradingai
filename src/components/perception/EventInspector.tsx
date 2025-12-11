"use client";

import type { JSX } from "react";
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
          const timing = event.scheduledAt
            ? formatTiming(event.scheduledAt, t)
            : t("perception.rings.insights.event.noTime");
          const isHigh = severity === "high";
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
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {severityLabel} · {timing}
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
        {list}
      </div>
    </RingInspectorLayout>
  );
}
