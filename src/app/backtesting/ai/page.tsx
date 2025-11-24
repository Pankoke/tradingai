import React from "react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">KI-Backtesting</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">
          Geplante KI-gestützte Backtesting-Umgebung für automatisierte Auswertungen und Scoring.
        </p>
      </div>
    </div>
  );
}
