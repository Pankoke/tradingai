"use client";

import { Bell, CalendarClock, Clock } from "lucide-react";
import type { JSX } from "react";
import type { Setup } from "@/src/lib/engine/types";
import { cn } from "@/lib/utils";
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
      <section className="h-full rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <HeaderRow title={t("perception.eventStrip.title")} badge={t("perception.eventStrip.none")} />
        <div className="text-xs text-slate-300">{t("perception.eventStrip.noneDetail")}</div>
      </section>
    );
  }

  const timing = topEvent.scheduledAt
    ? formatEventTiming(topEvent.scheduledAt, t)
    : t("perception.context.eventAt").replace("{time}", "n/a");
  const isFuture = topEvent.scheduledAt ? new Date(topEvent.scheduledAt).getTime() > new Date().getTime() : false;
  const impact: Impact =
    topEvent.severity === "high" || topEvent.severity === "High"
      ? "high"
      : topEvent.severity === "medium" || topEvent.severity === "Medium"
        ? "medium"
        : "low";

  const impactBadge = cn(
    "inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold border",
    impact === "high" && "border-rose-500/60 bg-rose-500/10 text-rose-300",
    impact === "medium" && "border-amber-500/60 bg-amber-500/10 text-amber-300",
    impact === "low" && "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
  );

  return (
    <section className="h-full rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
      <HeaderRow
        title={t("perception.eventStrip.title")}
        badge={t(`perception.eventStrip.impact.${impact}`)}
        badgeClassName={impactBadge}
      />
      <div className="space-y-2 text-xs text-slate-200">
        <InfoRow
          label={t(isFuture ? "perception.eventStrip.next" : "perception.eventStrip.last")}
          value={topEvent.title ?? t("perception.context.noEvent")}
          icon={Bell}
        />
        <InfoRow label={t("perception.eventStrip.time")} value={timing} icon={Clock} />
        <InfoRow
          label={t("perception.eventStrip.impactLabel").replace("{impact}", "")}
          value={t(`perception.eventStrip.impact.${impact}`)}
          icon={CalendarClock}
        />
      </div>
    </section>
  );
}

type HeaderRowProps = {
  title: string;
  badge: string;
  badgeClassName?: string;
};

function HeaderRow({ title, badge, badgeClassName }: HeaderRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      <span className={badgeClassName ?? "text-xs font-semibold text-slate-200"}>{badge}</span>
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  icon: typeof Bell;
};

function InfoRow({ label, value, icon: Icon }: InfoRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <span className="text-slate-100">{value}</span>
    </div>
  );
}
