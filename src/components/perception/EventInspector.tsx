"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import type { Setup } from "@/src/lib/engine/types";

type EventInspectorProps = {
  setup: Setup;
  variant?: "full" | "compact";
  className?: string;
};

export function EventInspector({ setup, className }: EventInspectorProps): JSX.Element {
  const t = useT();
  const score = setup.rings?.eventScore ?? 50;
  const events = setup.eventContext?.topEvents ?? [];
  const hasHighEvent = events.some((event) => event?.severity?.toLowerCase() === "high");

  const eventsLabel =
    events.length > 0
      ? t("perception.event.eventsAvailable").replace(
          "{count}",
          String(events.length),
        )
      : t("perception.event.noEvents");

  return (
    <section
      className={`rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-[0_10px_40px_rgba(2,6,23,0.4)] ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {t("perception.event.heading")}
          </p>
          <p className="text-sm text-slate-200">{eventsLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-white">{score}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            /100
          </span>
        </div>
      </div>

      {events.length > 0 && (
        <div className="mt-3 space-y-3">
          {events.slice(0, 3).map((event, index) => (
            <div
              key={`${event?.id ?? index}`}
              className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-3 text-sm text-slate-200"
            >
              <p className="font-semibold text-slate-100">{event?.title ?? t("perception.event.untitled")}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {event?.severity ?? "medium"}
                {event?.scheduledAt ? ` · ${event.scheduledAt}` : null}
              </p>
              {event?.category && (
                <p className="text-xs text-slate-500">{event.category}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {hasHighEvent && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          {t("perception.event.highImpactWarning")}
        </p>
      )}
    </section>
  );
}
