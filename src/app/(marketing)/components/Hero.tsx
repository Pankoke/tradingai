import React from "react";
import type { JSX } from "react";

type HeroStatProps = {
  label: string;
  value: string;
  icon: string;
};

function HeroStat({ label, value, icon }: HeroStatProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-4 shadow-[0_10px_25px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span aria-hidden="true" className="text-base">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export function Hero(): JSX.Element {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-[0.7rem] text-[var(--text-secondary)] shadow-sm shadow-[rgba(34,197,94,0.15)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          <span className="font-medium">AI-powered · Snapshot-basiert</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Perception Lab – KI-gestützte Markt-Setups
          </h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
            Die Perception Engine kombiniert regelbasierte Marktanalyse mit KI und erzeugt täglich klare,
            objektive und handelbare Setups.
          </p>
        </div>
        <a
          href="#perception-lab"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline decoration-[var(--accent)] underline-offset-4 hover:brightness-110"
        >
          Was ist das Perception Lab?
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="space-y-3">
        <div className="flex justify-end">
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs text-[var(--text-secondary)] shadow-sm">
            {today}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <HeroStat icon="📈" label="Analysierte Assets heute" value="32" />
          <HeroStat icon="🧭" label="Aktive Setups" value="24" />
          <HeroStat icon="⚡" label="Starke Signale" value="7" />
          <HeroStat icon="🛡️" label="Schwache Signale" value="5" />
        </div>
      </div>
    </section>
  );
}
