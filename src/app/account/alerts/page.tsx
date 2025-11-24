import React from "react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Alerts</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">
          Platzhalter für Alert-Regeln, E-Mail/Push-Einstellungen und Eskalationen.
        </p>
      </div>
    </div>
  );
}
