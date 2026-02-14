import type { JSX } from "react";
import Link from "next/link";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";

type PageProps = {
  params: Promise<{ locale?: string }>;
};

type ChangelogEntry = {
  version: string;
  date: string;
  category: string;
  items: string[];
};

const content: Record<
  Locale,
  {
    title: string;
    intro: string;
    categoryLabel: string;
    learnLinkLabel: string;
    statusLinkLabel: string;
    entries: ChangelogEntry[];
  }
> = {
  en: {
    title: "Perception Lab - Engine Changelog",
    intro:
      "We publish engine and methodology updates to keep the Perception Lab transparent and continuously improving. Each entry documents structural adjustments to scoring, event handling, coverage, or monitoring features.",
    categoryLabel: "Category",
    learnLinkLabel: "Learn how the framework works ->",
    statusLinkLabel: "View operational status ->",
    entries: [
      {
        version: "v1.2.0",
        date: "2026-02-12",
        category: "Scoring & Event Handling",
        items: [
          "Snapshot scoring normalization refined",
          "Event weighting adjustment",
          "Improved fallback transparency",
        ],
      },
      {
        version: "v1.1.0",
        date: "2026-01-28",
        category: "Coverage & Monitoring",
        items: [
          "Added ring distribution overview",
          "Improved asset coverage stability",
        ],
      },
      {
        version: "v1.0.0",
        date: "Initial Release",
        category: "Core Engine",
        items: [
          "Snapshot-based multi-factor scoring",
          "Structured setup generation",
          "Confidence alignment model",
        ],
      },
    ],
  },
  de: {
    title: "Perception Lab - Engine-Aenderungsprotokoll",
    intro:
      "Wir veroeffentlichen Engine- und Methodik-Updates, um das Perception Lab transparent und kontinuierlich weiterzuentwickeln. Jeder Eintrag dokumentiert strukturelle Anpassungen bei Scoring, Event-Verarbeitung, Abdeckung oder Monitoring-Funktionen.",
    categoryLabel: "Kategorie",
    learnLinkLabel: "Erklaerung des Frameworks ansehen ->",
    statusLinkLabel: "Operativen Status ansehen ->",
    entries: [
      {
        version: "v1.2.0",
        date: "2026-02-12",
        category: "Scoring & Event-Verarbeitung",
        items: [
          "Verfeinerte Normalisierung im Snapshot-Scoring",
          "Anpassung der Event-Gewichtung",
          "Verbesserte Transparenz bei Fallbacks",
        ],
      },
      {
        version: "v1.1.0",
        date: "2026-01-28",
        category: "Abdeckung & Monitoring",
        items: [
          "Uebersicht der Ring-Verteilung ergaenzt",
          "Stabilitaet der Asset-Abdeckung verbessert",
        ],
      },
      {
        version: "v1.0.0",
        date: "Initiale Version",
        category: "Kern-Engine",
        items: [
          "Snapshot-basiertes Multi-Faktor-Scoring",
          "Strukturierte Setup-Generierung",
          "Confidence-Ausrichtungsmodell",
        ],
      },
    ],
  },
};

export default async function ChangelogPage({ params }: PageProps): Promise<JSX.Element> {
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
          {pageContent.entries.map((entry) => (
            <section
              key={`${entry.version}-${entry.date}`}
              className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5"
            >
              <h2 className="text-lg font-semibold">
                {entry.version} - {entry.date}
              </h2>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                {pageContent.categoryLabel}: {entry.category}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="border-t border-[var(--border-subtle)] pt-4 text-sm">
          <div>
            <Link href={`/${locale}/how-it-works`} className="text-[var(--accent)] hover:underline">
              {pageContent.learnLinkLabel}
            </Link>
          </div>
          <div className="mt-2">
            <Link
              href={`/${locale}/premium/perception`}
              className="text-[var(--accent)] hover:underline"
            >
              {pageContent.statusLinkLabel}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
