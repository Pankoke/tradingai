import type { Locale } from "@/src/lib/i18n/config";

export type RadarCopy = {
  title: string;
  subtitle: string;
  disclaimer: string;
  controls: {
    searchPlaceholder: string;
    sortLabel: string;
    timeframeLabel: string;
    conflictLabel: string;
    contextLabel: string;
    all: string;
    sorts: {
      attention: string;
      alignment: string;
      conflict: string;
      freshness: string;
    };
  };
  fields: {
    context: string;
    alignment: string;
    conflict: string;
    freshness: string;
    asOf: string;
    attention: string;
  };
  context: {
    long: string;
    short: string;
    neutral: string;
  };
  conflict: {
    low: string;
    moderate: string;
    high: string;
  };
  empty: string;
};

const EN_COPY: RadarCopy = {
  title: "Market Radar",
  subtitle: "Overview of current structural contexts across available assets.",
  disclaimer: "Informational model output. Not financial advice.",
  controls: {
    searchPlaceholder: "Search symbol or asset",
    sortLabel: "Sort",
    timeframeLabel: "Timeframe",
    conflictLabel: "Conflict",
    contextLabel: "Context",
    all: "All",
    sorts: {
      attention: "Attention",
      alignment: "Alignment",
      conflict: "Conflict",
      freshness: "Freshness",
    },
  },
  fields: {
    context: "Context",
    alignment: "Alignment",
    conflict: "Conflict",
    freshness: "Freshness",
    asOf: "As-of",
    attention: "Attention",
  },
  context: {
    long: "Long Context",
    short: "Short Context",
    neutral: "Neutral Context",
  },
  conflict: {
    low: "Low",
    moderate: "Moderate",
    high: "High",
  },
  empty: "No setup contexts available for the selected filters.",
};

const DE_COPY: RadarCopy = {
  title: "Market Radar",
  subtitle: "Uebersicht der aktuellen strukturellen Kontexte ueber verfuegbare Assets.",
  disclaimer: "Informative Modellausgabe. Keine Finanzberatung.",
  controls: {
    searchPlaceholder: "Symbol oder Asset suchen",
    sortLabel: "Sortierung",
    timeframeLabel: "Zeitrahmen",
    conflictLabel: "Konflikt",
    contextLabel: "Kontext",
    all: "Alle",
    sorts: {
      attention: "Aufmerksamkeit",
      alignment: "Alignment",
      conflict: "Konflikt",
      freshness: "Aktualitaet",
    },
  },
  fields: {
    context: "Kontext",
    alignment: "Alignment",
    conflict: "Konflikt",
    freshness: "Aktualitaet",
    asOf: "Stand",
    attention: "Aufmerksamkeit",
  },
  context: {
    long: "Long-Kontext",
    short: "Short-Kontext",
    neutral: "Neutraler Kontext",
  },
  conflict: {
    low: "Niedrig",
    moderate: "Moderat",
    high: "Hoch",
  },
  empty: "Keine Setup-Kontexte fuer die gewaehlten Filter verfuegbar.",
};

export function getRadarCopy(locale: Locale): RadarCopy {
  return locale === "de" ? DE_COPY : EN_COPY;
}
