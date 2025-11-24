import React from "react";
import type { JSX } from "react";

export function Features(): JSX.Element {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Was ist das Perception Lab?</h2>
      <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
        Das Perception Lab kombiniert regelbasierte Marktanalyse mit KI-gestützter
        Auswertung. Statt stundenlang Charts zu scannen, erhältst du täglich
        vorsortierte Setups mit klarer Struktur und transparenter Scoring-Logik.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          title="KI-gestützte Analyse"
          description="Die Engine verarbeitet Marktstruktur, Events, Sentiment und Volumen und erstellt daraus konsistente Setups."
        />
        <FeatureCard
          title="Multi-Faktor-Bewertung"
          description="Event-Risiko, Bias, Sentiment und Balance fließen in einen kombinierten Confidence-Score ein."
        />
        <FeatureCard
          title="Klare Setups"
          description="Jedes Setup bringt konkrete Entry-Zonen, Stop-Loss und Take-Profit Levels mit – kein Rätselraten."
        />
        <FeatureCard
          title="Konsistente Entscheidungen"
          description="Durch standardisierte Kriterien triffst du Entscheidungen weniger aus dem Bauch heraus und mehr aus System."
        />
      </div>
    </section>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
};

function FeatureCard({ title, description }: FeatureCardProps): JSX.Element {
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)]">{description}</p>
    </article>
  );
}
