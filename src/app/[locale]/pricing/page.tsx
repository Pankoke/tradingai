import React from "react";
import type { JSX } from "react";

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "0 € / Monat",
    description: "Einstieg mit einem Top-Setup plus einigen freien Setups.",
    features: [
      "Setup des Tages",
      "3–4 weitere freie Setups",
      "Basis-Perception-Übersicht",
      "Keine Zahlung erforderlich",
    ],
    cta: "Kostenlos nutzen",
  },
  {
    name: "Premium",
    price: "29–49 € / Monat",
    description: "Voller Zugriff auf alle Setups für aktive Trader.",
    features: [
      "Alle täglichen Setups (20–40)",
      "Setup-Historie (7–30 Tage)",
      "Alerts für Assets & Scores",
      "Favoriten & Trading-Journal",
      "E-Mail-Alerts",
    ],
    cta: "Auf Premium upgraden",
    highlighted: true,
    badge: "Empfohlen",
  },
  {
    name: "Pro",
    price: "79–99 € / Monat",
    description: "Für Power-User, Automatisierung und API-Zugriff.",
    features: [
      "Erweiterte Historie (60–90 Tage)",
      "Erweiterte Filter & Scoring-Tools",
      "API-Zugriff auf Setups & Scores",
      "Priorisierte Alerts",
      "Erweiterte Backtesting-Features (in Planung)",
    ],
    cta: "Pro testen",
  },
];

const comparison = [
  { feature: "Tägliche Setups", free: "Basis", premium: "Alle", pro: "Alle" },
  { feature: "Historie", free: "—", premium: "7–30 Tage", pro: "60–90 Tage" },
  { feature: "Alerts", free: "—", premium: "E-Mail", pro: "E-Mail + priorisiert" },
  { feature: "Trading-Journal", free: "—", premium: "Favoriten & Notes", pro: "Erweitert" },
  { feature: "Backtesting-Module", free: "—", premium: "Standard", pro: "Erweitert" },
  { feature: "API-Zugriff", free: "—", premium: "—", pro: "✓" },
];

export default function Page(): JSX.Element {
  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pricing & Pläne</h1>
          <p className="max-w-3xl text-sm text-[var(--text-secondary)] sm:text-base">
            Free für den Einstieg mit wenigen Setups, Premium für aktive Trader mit vollem Zugriff, Pro für Automatisierung
            und API/Integrationen.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md ${
                plan.highlighted ? "ring-1 ring-[rgba(34,197,94,0.25)] shadow-lg" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {plan.badge ? (
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
                    {plan.badge}
                  </span>
                ) : null}
              </div>
              <div>
                <div className="text-2xl font-bold">{plan.price}</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{plan.description}</p>
              </div>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-0.5 text-[var(--accent)]">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <button
                  type="button"
                  className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-[var(--accent)] text-black shadow-[0_10px_20px_rgba(34,197,94,0.25)] hover:opacity-90"
                      : "border border-[var(--border-subtle)] bg-[var(--bg-main)] text-[var(--text-primary)] hover:border-[var(--accent)]"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md">
          <h3 className="text-lg font-semibold">Vergleich</h3>
          <div className="grid gap-3 text-sm text-[var(--text-secondary)]">
            <div className="grid grid-cols-4 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              <span>Feature</span>
              <span>Free</span>
              <span>Premium</span>
              <span>Pro</span>
            </div>
            {comparison.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-4 items-center gap-2 rounded-xl bg-[var(--bg-main)] px-3 py-2 text-sm"
              >
                <span className="font-medium text-[var(--text-primary)]">{row.feature}</span>
                <span>{row.free}</span>
                <span>{row.premium}</span>
                <span>{row.pro}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-md">
          <h3 className="text-lg font-semibold">API Access</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Pro-User erhalten Zugriff auf API und Webhooks, um Setups & Scores direkt in eigene Systeme zu integrieren.
            Details folgen – erste Infos findest du in den Docs.
          </p>
          <a
            href="/docs/api"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] underline decoration-[var(--accent)] underline-offset-4 hover:brightness-110"
          >
            Mehr in den Docs →
          </a>
        </section>
      </div>
    </div>
  );
}
