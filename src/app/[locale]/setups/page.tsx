import React from "react";
import type { JSX } from "react";
import { SetupCard } from "../(marketing)/components/SetupCard";
import { mockSetups } from "../../../lib/mockSetups";

export default function SetupsPage(): JSX.Element {
  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Alle Setups</h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
            Vorschau auf aktuelle Setups. Detailansicht mit mehr Infos und Scoring folgt per Klick auf Analyse.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockSetups.map((setup) => (
            <SetupCard key={setup.id} setup={setup} />
          ))}
        </div>
      </div>
    </div>
  );
}
