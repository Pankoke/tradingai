import type { JSX } from "react";
import type { Locale } from "@/src/lib/i18n/config";

type PageProps = {
  params: { locale: Locale };
};

export default function PerceptionDeepDivePage({ params }: PageProps): JSX.Element {
  const isDe = params.locale === "de";

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isDe ? "Perception Lab – Deep Dive" : "Perception Lab – Deep dive"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)] md:text-base">
          {isDe
            ? "Hier findest du eine detaillierte Beschreibung der Analyse-Module, Scores und des Setuprankings."
            : "A detailed description of the analysis modules, scores and setup ranking."}
        </p>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">
              {isDe ? "Module der Perception Engine" : "Perception engine modules"}
            </h2>
            <ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
              <li>
                <strong className="text-[var(--text-primary)]">
                  {isDe ? "Marktstruktur:" : "Market structure:"}
                </strong>{" "}
                {isDe
                  ? "Trend, Unterstützungen, Widerstände, Volatilität."
                  : "Trend, support and resistance levels, volatility."}
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">
                  {isDe ? "Events:" : "Events:"}
                </strong>{" "}
                {isDe
                  ? "Makro-, Krypto- und On-Chain-Events mit Impact-Scores."
                  : "Macro, crypto and on-chain events with impact scores."}
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">
                  {isDe ? "Sentiment & Flow:" : "Sentiment & flow:"}
                </strong>{" "}
                {isDe
                  ? "Funding, Orderflow und Stimmungsindikatoren."
                  : "Funding, orderflow and sentiment indicators."}
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">
                  {isDe ? "Scoring & Auswahl:" : "Scoring & selection:"}
                </strong>{" "}
                {isDe
                  ? "KI-gestützte Scores und Ranking je Asset und Timeframe."
                  : "AI-assisted scores and ranking per asset and timeframe."}
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              {isDe ? "Snapshots & Historie" : "Snapshots & history"}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {isDe
                ? "Jeder Handelstag erzeugt einen Snapshot mit allen Setups. Premium- und Pro-User können diese Historie später für Backtests nutzen."
                : "Each trading day yields a snapshot with all setups. Premium and Pro users will later use this history for backtests."}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
