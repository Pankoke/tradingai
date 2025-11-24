import React from "react";
import type { JSX } from "react";

export function CTA(): JSX.Element {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Mehr Setups freischalten</h2>
        <p className="max-w-xl text-xs text-[var(--text-secondary)] sm:text-sm">
          Im Free-Tier erhältst du das Setup des Tages und einige zusätzliche
          Beispiele. Mit Premium schaltest du alle Setups, Historie und Alerts
          frei – ideal, um deinen täglichen Trading-Workflow zu strukturieren.
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm sm:text-xs">
        <button
          type="button"
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:opacity-90"
        >
          Perception Pro entdecken
        </button>
        <span className="text-[0.7rem] text-[var(--text-secondary)]">
          Ab ca. 29–49 € pro Monat · jederzeit kündbar
        </span>
      </div>
    </section>
  );
}
