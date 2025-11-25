import React from "react";
import type { JSX } from "react";
import { SetupCard } from "../(marketing)/components/SetupCard";
import { SetupOfTheDayCard } from "../(marketing)/components/SetupOfTheDayCard";
import { EngineMetaPanel } from "@/src/components/perception/EngineMetaPanel";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { Setup } from "@/src/lib/engine/types";

export default async function SetupsPage(): Promise<JSX.Element> {
  const snapshot = await buildPerceptionSnapshot();
  const { setups, setupOfTheDayId } = snapshot;
  const setupOfTheDay = setups.find((s) => s.id === setupOfTheDayId) ?? null;
  const otherSetups = setups.filter((s) => s.id !== setupOfTheDayId).slice(0, 3);

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Setups</h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
            Setup des Tages und freie Setups als Vorschau. Mehr Details per Analyse-Button.
          </p>
        </div>

        <EngineMetaPanel
          generatedAt={snapshot.generatedAt}
          version={snapshot.version}
        />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Setup des Tages</h2>
          {setupOfTheDay ? (
            <SetupOfTheDayCard setup={setupOfTheDay} />
          ) : (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              Aktuell kein Setup des Tages verfügbar.
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Weitere Setups</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherSetups.map((setup) => (
              <SetupCard key={setup.id} setup={setup} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
