import type { JSX } from "react";
import type { Locale } from "@/src/lib/i18n/config";

type PageProps = {
  params: { locale: Locale };
};

export default function HowItWorksPage({ params }: PageProps): JSX.Element {
  const isDe = params.locale === "de";

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isDe ? "How it works" : "How it works"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)] md:text-base">
          {isDe
            ? "Das Perception Lab kombiniert feste Analyse-Regeln mit KI-Modellen. Aus Marktstruktur, Events, Bias und Sentiment entstehen täglich strukturierte Setups."
            : "The Perception Lab combines rule-based analysis with AI models. From market structure, events, bias, and sentiment it generates structured daily setups."}
        </p>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">
              {isDe ? "1. Datenquellen" : "1. Data sources"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {isDe
                ? "Marktstruktur, Volatilität, Makro- und Krypto-Events, Sentiment- und Flow-Daten werden gesammelt und in ein einheitliches Format gebracht."
                : "Market structure, volatility, macro and crypto events, sentiment and flow data are collected and normalised into a unified format."}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              {isDe ? "2. Scoring & Ranking" : "2. Scoring & ranking"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {isDe
                ? "Für jedes Asset werden Events, Bias, Sentiment und Orderflow bewertet. Daraus entstehen Scores und ein Ranking der interessantesten Setups."
                : "For each asset, events, bias, sentiment and orderflow are scored. This produces scores and a ranking of the most interesting setups."}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              {isDe ? "3. Setup-Generierung" : "3. Setup generation"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {isDe
                ? "Auf Basis der Scores erzeugt das System konkrete Setups mit Entry-Zonen, Stop-Loss, Take-Profit und Confidence-Werten."
                : "Based on these scores, the engine generates concrete setups with entry zones, stop-loss, take-profit and confidence values."}
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <h3 className="text-sm font-semibold">
              {isDe ? "Free Setups" : "Free setups"}
            </h3>
            <p className="mt-2 text-xs text-[var(--text-secondary)] md:text-sm">
              {isDe
                ? "Auf der Free-Seite siehst du das Setup des Tages und einige weitere Setups als Vorschau."
                : "On the free page you see the setup of the day and a few additional setups as a preview."}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <h3 className="text-sm font-semibold">
              {isDe ? "Premium & Pro" : "Premium & Pro"}
            </h3>
            <p className="mt-2 text-xs text-[var(--text-secondary)] md:text-sm">
              {isDe
                ? "In den höheren Plänen bekommst du alle Setups, Historie, Backtesting-Features und API-Zugriff."
                : "Higher tiers unlock all setups, history, backtesting features and API access."}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
