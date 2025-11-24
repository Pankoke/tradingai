import React from "react";
import type { JSX } from "react";
import { buildPerceptionSnapshot } from "@/src/lib/engine/perceptionEngine";
import type { Setup, PerceptionSnapshot } from "@/src/lib/engine/types";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PerceptionPage(): Promise<JSX.Element> {
  const snapshot: PerceptionSnapshot = await buildPerceptionSnapshot();
  const { setups, setupOfTheDayId } = snapshot;

  const setupOfTheDay: Setup | undefined = setups.find((s) => s.id === setupOfTheDayId);
  const otherSetups: Setup[] = setups.filter((s) => s.id !== setupOfTheDayId);

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:py-10">
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Perception Lab – Snapshot</h1>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetaCard label="Generated" value={formatDate(snapshot.generatedAt)} />
            <MetaCard label="Version" value={snapshot.version} />
            <MetaCard label="Universe" value={snapshot.universe.join(", ")} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Setup des Tages</h2>
          {setupOfTheDay ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <SetupRow setup={setupOfTheDay} isSetupOfTheDay />
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              Derzeit kein Setup des Tages verfügbar.
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Alle Setups heute</h2>
          {otherSetups.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
              Keine weiteren Setups vorhanden.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherSetups.map((setup) => (
                <SetupRow key={setup.id} setup={setup} isSetupOfTheDay={setup.id === setupOfTheDayId} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

type MetaCardProps = {
  label: string;
  value: string;
};

function MetaCard({ label, value }: MetaCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
      <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

type SetupRowProps = {
  setup: Setup;
  isSetupOfTheDay?: boolean;
};

function SetupRow({ setup, isSetupOfTheDay = false }: SetupRowProps): JSX.Element {
  return (
    <article
      className={`flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-3 ${
        isSetupOfTheDay ? "shadow-md border-[var(--accent)]/50" : ""
      }`}
    >
      <header className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-[var(--text-primary)]">
            {setup.symbol} · {setup.timeframe}
          </div>
          {isSetupOfTheDay ? (
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--text-primary)]">
              Setup of the Day
            </span>
          ) : null}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            setup.direction === "Long" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {setup.direction}
        </span>
      </header>
      <div className="grid gap-2 text-xs text-[var(--text-secondary)] sm:grid-cols-2">
        <span>Confidence: {setup.confidence}%</span>
        <span>Event: {setup.eventScore}%</span>
        <span>Bias: {setup.biasScore}%</span>
        <span>Sentiment: {setup.sentimentScore}%</span>
        <span>Balance: {setup.balanceScore}%</span>
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <Level label="Entry" value={setup.entryZone} />
        <Level label="Stop" value={setup.stopLoss} tone="danger" />
        <Level label="TP" value={setup.takeProfit} tone="success" />
      </div>
    </article>
  );
}

type LevelProps = {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "success";
};

function Level({ label, value, tone = "neutral" }: LevelProps): JSX.Element {
  const color =
    tone === "danger" ? "text-red-400" : tone === "success" ? "text-emerald-400" : "text-[var(--text-primary)]";
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-2">
      <div className="text-[0.65rem] uppercase tracking-wide text-[var(--text-secondary)]">{label}</div>
      <div className={`text-xs font-semibold ${color}`}>{value}</div>
    </div>
  );
}
