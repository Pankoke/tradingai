import React from "react";
import type { JSX } from "react";
import Link from "next/link";

const badges = ["Alle Setups", "KI-Interpretationen", "Multi-Asset-Analysen", "Echtzeit-Alerts"];

export function CTA(): JSX.Element {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[0_15px_35px_rgba(0,0,0,0.3)] ring-1 ring-[rgba(34,197,94,0.08)] sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Mehr Setups freischalten</h2>
        <p className="max-w-xl text-sm text-[var(--text-secondary)] sm:text-base">
          Im Free-Tier siehst du nur eine Auswahl. In der Premium-Version erhältst du alle täglichen Setups,
          KI-Interpretationen, Multi-Asset-Analysen und Alerts – alles an einem Ort.
        </p>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1 text-[0.75rem] text-[var(--accent)]"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
        <Link
          href="/pricing"
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-black shadow-[0_10px_20px_rgba(34,197,94,0.25)] transition hover:opacity-90"
        >
          Pricing & Pläne
        </Link>
      </div>
    </section>
  );
}
