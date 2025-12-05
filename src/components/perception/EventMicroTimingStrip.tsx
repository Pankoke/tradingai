"use client";

import { Bell } from "lucide-react";
import type { JSX } from "react";
import type { Setup } from "@/src/lib/engine/types";
import { useT } from "@/src/lib/i18n/ClientProvider";

type Props = {
  eventContext?: Setup["eventContext"] | null;
};

type Impact = "low" | "medium" | "high";

export function formatEventTiming(isoDate: string, t: (k: string) => string): string {
  const target = new Date(isoDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Number.isFinite(diffMinutes) && Math.abs(diffMinutes) <= 24 * 60) {
    const hours = Math.max(0, Math.round(Math.abs(diffMinutes) / 60));
    return diffMinutes >= 0
      ? t("perception.context.eventIn").replace("{hours}", hours.toString())
      : t("perception.context.eventAgo").replace("{hours}", hours.toString());
  }

  return target.toLocaleString();
}

export function EventMicroTimingStrip({ eventContext }: Props): JSX.Element {
  const t = useT();
  const topEvent = eventContext?.topEvents?.[0];

  if (!topEvent) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
        <Bell className="h-4 w-4 text-slate-400" />
        <span>{t("perception.eventStrip.none")}</span>
      </div>
    );
  }

  const timing = topEvent.scheduledAt
    ? formatEventTiming(topEvent.scheduledAt, t)
    : t("perception.context.eventAt").replace("{time}", "n/a");
  const isFuture = topEvent.scheduledAt ? new Date(topEvent.scheduledAt).getTime() > Date.now() : false;
  const impact: Impact =
    topEvent.severity === "high" || topEvent.severity === "High"
      ? "high"
      : topEvent.severity === "medium" || topEvent.severity === "Medium"
        ? "medium"
        : "low";

  const impactTone =
    impact === "high"
      ? "text-rose-300"
      : impact === "medium"
        ? "text-amber-300"
        : "text-slate-300";

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
      <Bell className="h-4 w-4 text-slate-400" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <span className="font-semibold text-slate-100">
          {isFuture ? t("perception.eventStrip.next") : t("perception.eventStrip.last")}:
        </span>
        <span className="text-slate-200">
          {topEvent.title ?? t("perception.context.noEvent")} · {timing} ·{" "}
          <span className={impactTone}>{t(`perception.eventStrip.impact.${impact}`)}</span>
        </span>
      </div>
    </div>
  );
}
