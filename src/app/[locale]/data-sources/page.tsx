import type { JSX } from "react";
import Link from "next/link";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";

type PageProps = {
  params: Promise<{ locale?: string }>;
};

type Section = {
  title: string;
  body: string;
};

const content: Record<
  Locale,
  {
    title: string;
    intro: string;
    sections: Section[];
    links: {
      howItWorks: string;
      premiumStatus: string;
      changelog: string;
    };
  }
> = {
  en: {
    title: "Data Sources & Coverage Transparency",
    intro:
      "This page documents which data inputs support the Perception Lab and how coverage is handled when data quality varies across assets or windows.",
    sections: [
      {
        title: "Primary Market Data",
        body:
          "Perception snapshots are built from market structure inputs such as candles, volatility context, and event metadata. Sentiment and orderflow layers are included as supplementary factors where available.",
      },
      {
        title: "Fallback Hierarchy",
        body:
          "If preferred inputs are unavailable or stale, the engine applies fallback paths and marks reduced certainty through quality flags and fallback indicators in the snapshot context.",
      },
      {
        title: "Snapshot Model",
        body:
          "Outputs are published as timestamped snapshots. They represent conditions at publication time and are not a live execution feed or a continuous forecasting stream.",
      },
      {
        title: "Coverage & Limitations",
        body:
          "Coverage differs by asset, timeframe, and source availability. Some symbols can have partial feature depth, delayed updates, or reduced signal layers during constrained data windows.",
      },
    ],
    links: {
      howItWorks: "Learn how the framework works ->",
      premiumStatus: "View operational status ->",
      changelog: "Open engine changelog ->",
    },
  },
  de: {
    title: "Datenquellen & Transparenz der Abdeckung",
    intro:
      "Diese Seite beschreibt, welche Datenquellen das Perception Lab nutzen und wie die Abdeckung behandelt wird, wenn Datenqualitaet je Asset oder Zeitfenster variiert.",
    sections: [
      {
        title: "Primaere Marktdaten",
        body:
          "Perception-Snapshots basieren auf Strukturdaten wie Candles, Volatilitaetskontext und Event-Metadaten. Sentiment- und Orderflow-Layer werden, falls verfuegbar, als ergaenzende Faktoren eingebunden.",
      },
      {
        title: "Fallback-Hierarchie",
        body:
          "Wenn bevorzugte Inputs fehlen oder veraltet sind, greift die Engine auf definierte Fallback-Pfade zurueck und markiert reduzierte Sicherheit ueber Qualitaets- und Fallback-Hinweise.",
      },
      {
        title: "Snapshot-Modell",
        body:
          "Ausgaben werden als zeitgestempelte Snapshots veroeffentlicht. Sie zeigen den Zustand zum Publikationszeitpunkt und sind weder Live-Execution-Feed noch kontinuierlicher Forecast-Stream.",
      },
      {
        title: "Abdeckung & Grenzen",
        body:
          "Die Abdeckung variiert nach Asset, Timeframe und Datenverfuegbarkeit. Bei einzelnen Symbolen kann es zu geringerer Feature-Tiefe, verzoegerten Updates oder eingeschraenkten Signallayern kommen.",
      },
    ],
    links: {
      howItWorks: "Erklaerung des Frameworks ansehen ->",
      premiumStatus: "Operativen Status ansehen ->",
      changelog: "Engine-Aenderungsprotokoll oeffnen ->",
    },
  },
};

export default async function DataSourcesPage({ params }: PageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const localeParam = resolvedParams?.locale ?? i18nConfig.defaultLocale;
  const locale: Locale = i18nConfig.locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : i18nConfig.defaultLocale;
  const pageContent = content[locale];

  return (
    <main className="min-h-screen bg-[var(--bg-main)] px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6 text-[var(--text-primary)]">
        <h1 className="text-2xl font-semibold">{pageContent.title}</h1>
        <p className="text-sm text-[var(--text-secondary)]">{pageContent.intro}</p>

        <div className="space-y-4">
          {pageContent.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-4 text-sm">
          <div>
            <Link href={`/${locale}/how-it-works`} className="text-[var(--accent)] hover:underline">
              {pageContent.links.howItWorks}
            </Link>
          </div>
          <div className="mt-2">
            <Link
              href={`/${locale}/premium/perception`}
              className="text-[var(--accent)] hover:underline"
            >
              {pageContent.links.premiumStatus}
            </Link>
          </div>
          <div className="mt-2">
            <Link href={`/${locale}/changelog`} className="text-[var(--accent)] hover:underline">
              {pageContent.links.changelog}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
