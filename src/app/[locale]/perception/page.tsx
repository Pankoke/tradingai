import React from "react";
import type { JSX } from "react";

const steps = [
  {
    title: "Marktstruktur",
    description: "Unterstützungen, Widerstände, Trend, Volatilität werden analysiert, um den strukturellen Kontext zu bestimmen.",
  },
  {
    title: "Event-Bewertung",
    description: "Wirtschaftsdaten, News und Risiko-Faktoren fließen in einen Event-Score ein, der Setups gewichtet.",
  },
  {
    title: "Sentiment & Bias",
    description: "Funding, Fear/Greed und Flow-Daten geben Hinweise auf Marktstimmung und Richtung.",
  },
  {
    title: "Setup-Scoring",
    description: "Die KI bewertet Relevanz, Timing und Qualität und erzeugt einen Confidence-Score pro Setup.",
  },
];

export default function PerceptionPage(): JSX.Element {
  const today = new Date().toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:py-10">
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Perception Lab – Analyse Engine
          </h1>
          <div className="space-y-3 text-sm text-[var(--text-secondary)] sm:text-base">
            <p>
              Die Perception Engine verarbeitet Marktstruktur, Events und Sentiment und erzeugt daraus tägliche Snapshots
              mit klar definierten Setups.
            </p>
            <p>
              Als Quellen dienen Marktstruktur-Analysen, Makro- und Mikro-Events sowie Sentiment-Signale. Jeden Tag entsteht
              ein Snapshot, der auf der Landing Page sichtbar ist.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Engine-Logik in Schritten</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
              >
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-2 text-xs text-[var(--text-secondary)] sm:text-sm">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Beispiel-Snapshot</h2>
          <p className="text-sm text-[var(--text-secondary)] sm:text-base">
            Auf der Landing-Page siehst du täglich einen Snapshot aller produzierten Setups. Die Perception-Seite erklärt
            das zugrunde liegende System.
          </p>
          <div className="max-w-xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-[var(--text-secondary)]">Datum</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{today}</div>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--text-primary)]">
                Snapshot Engine aktiv
              </span>
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)] sm:text-sm">
              Die Engine generiert täglich neue Setups und bewertet sie nach Relevanz und Risiko. Die Ergebnisse erscheinen
              auf der Landing Page, während dieser Bereich die Methodik erklärt.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
