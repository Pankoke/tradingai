import React from "react";
import type { JSX } from "react";

export function Hero(): JSX.Element {
  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="space-y-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs text-[var(--text-secondary)]">
        <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
        <span>AI-powered · Snapshot-basiert · {today}</span>
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          Perception Lab – KI-gestützte Markt-Setups
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
          Die Perception Engine analysiert Marktstruktur, Events und Sentiment,
          bündelt alles in klaren Setups mit Entry, Stop-Loss, Take-Profit
          und Confidence-Scores – bereit für deinen nächsten Trading-Tag.
        </p>
      </div>
      <div className="grid gap-3 text-xs sm:grid-cols-2 md:grid-cols-4">
        <HeroStat label="Analysierte Assets heute" value="32" />
        <HeroStat label="Aktive Setups" value="24" />
        <HeroStat label="Starke Signale" value="7" />
        <HeroStat label="Schwache Signale" value="5" />
      </div>
    </section>
  );
}

type HeroStatProps = {
  label: string;
  value: string;
};

function HeroStat({ label, value }: HeroStatProps): JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3">
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
