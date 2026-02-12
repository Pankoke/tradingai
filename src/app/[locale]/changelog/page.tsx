import type { JSX } from "react";
import { i18nConfig, type Locale } from "@/src/lib/i18n/config";

type PageProps = {
  params: Promise<{ locale?: string }>;
};

type ChangelogEntry = {
  version: string;
  date: string;
  items: string[];
};

const content: Record<
  Locale,
  { title: string; entries: ChangelogEntry[] }
> = {
  en: {
    title: "Perception Lab - Engine Changelog",
    entries: [
      {
        version: "v1.2.0",
        date: "2026-02-12",
        items: [
          "Snapshot scoring normalization refined",
          "Event weighting adjustment",
          "Improved fallback transparency",
        ],
      },
      {
        version: "v1.1.0",
        date: "2026-01-28",
        items: [
          "Added ring distribution overview",
          "Improved asset coverage stability",
        ],
      },
      {
        version: "v1.0.0",
        date: "Initial Release",
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
    entries: [
      {
        version: "v1.2.0",
        date: "2026-02-12",
        items: [
          "Verfeinerte Normalisierung im Snapshot-Scoring",
          "Anpassung der Event-Gewichtung",
          "Verbesserte Transparenz bei Fallbacks",
        ],
      },
      {
        version: "v1.1.0",
        date: "2026-01-28",
        items: [
          "Uebersicht der Ring-Verteilung ergaenzt",
          "Stabilitaet der Asset-Abdeckung verbessert",
        ],
      },
      {
        version: "v1.0.0",
        date: "Initiale Version",
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
        <div className="space-y-4">
          {pageContent.entries.map((entry) => (
            <section
              key={`${entry.version}-${entry.date}`}
              className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5"
            >
              <h2 className="text-lg font-semibold">
                {entry.version} - {entry.date}
              </h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
