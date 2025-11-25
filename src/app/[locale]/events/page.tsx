"use client";

import React, { useEffect, useState } from "react";
import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { fetchTodayEvents } from "@/src/lib/api/eventsBiasClient";
import type { Event } from "@/src/lib/engine/eventsBiasTypes";

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

type LoadState = "idle" | "loading" | "error";

export default function EventsPage(): JSX.Element {
  const t = useT();
  const [events, setEvents] = useState<Event[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const data = await fetchTodayEvents();
        setEvents(data);
        setState("idle");
      } catch (error) {
        console.error(error);
        setState("error");
      }
    };
    void load();
  }, []);

  if (state === "loading") {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[var(--text-secondary)]">Lädt Events ...</div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[var(--text-secondary)]">
          {t("events.empty")}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("events.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">{t("events.subtitle")}</p>
        </header>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
            {t("events.empty")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <article
                key={event.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">{event.title}</h2>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge tone="muted">{t(`events.category.${event.category}`)}</Badge>
                    <Badge tone={event.severity === "high" ? "danger" : event.severity === "medium" ? "warn" : "muted"}>
                      {t(`events.severity.${event.severity}`)}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{event.description}</p>
                <div className="text-xs text-[var(--text-secondary)]">
                  <div>
                    {t("events.time.start")}: {formatDate(event.startTime)}
                  </div>
                  {event.endTime ? (
                    <div>
                      {t("events.time.end")}: {formatDate(event.endTime)}
                    </div>
                  ) : null}
                  <div className="mt-1">
                    {t("events.symbols.label")}: {event.symbols.length > 0 ? event.symbols.join(", ") : "Global"}
                  </div>
                  <div className="mt-1">Source: {event.source}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type BadgeProps = {
  children: string;
  tone?: "muted" | "warn" | "danger";
};

function Badge({ children, tone = "muted" }: BadgeProps): JSX.Element {
  const styles =
    tone === "danger"
      ? "bg-red-500/15 text-red-300 border-red-500/40"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
        : "bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-subtle)]";
  return (
    <span className={`rounded-full border px-2 py-0.5 font-semibold ${styles}`}>
      {children}
    </span>
  );
}
