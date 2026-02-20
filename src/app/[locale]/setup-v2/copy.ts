import type { Locale } from "@/src/lib/i18n/config";

export type SetupV2Copy = {
  pageTitle: string;
  statusHint: string;
  common: {
    na: string;
    none: string;
    asOf: string;
    unknown: string;
  };
  hero: {
    contextDirection: string;
    alignmentIndex: string;
    conflictLevel: string;
    riskProfile: string;
    asOf: string;
  };
  context: {
    long: string;
    short: string;
    neutral: string;
  };
  conflict: {
    title: string;
    subtitle: string;
    none: string;
    low: string;
    medium: string;
    high: string;
    items: {
      flowTrend: string;
      biasSentiment: string;
      eventPressure: string;
      fallbackQuality: string;
    };
  };
  zones: {
    title: string;
    interaction: string;
    invalidation: string;
    objective: string;
    unavailable: string;
  };
  drivers: {
    title: string;
    trend: string;
    bias: string;
    sentiment: string;
    orderflow: string;
    event: string;
    confidence: string;
  };
  details: {
    titleMetrics: string;
    titleDefinitions: string;
    titleMetadata: string;
    metrics: {
      setupGrade: string;
      decisionClass: string;
      eventModifier: string;
      riskRewardRatio: string;
    };
    metadata: {
      snapshotId: string;
      snapshotLabel: string;
      engineVersion: string;
      generated: string;
    };
    definitions: {
      alignment: string;
      conflict: string;
      zones: string;
    };
  };
};

const EN_COPY: SetupV2Copy = {
  pageTitle: "Setup View V2",
  statusHint: "Informational model output. Not financial advice.",
  common: {
    na: "n/a",
    none: "none",
    asOf: "As-of",
    unknown: "unknown",
  },
  hero: {
    contextDirection: "Computed Context Direction",
    alignmentIndex: "Alignment Index",
    conflictLevel: "Conflict Level",
    riskProfile: "Risk Profile",
    asOf: "As-of",
  },
  context: {
    long: "Long Context",
    short: "Short Context",
    neutral: "Neutral Context",
  },
  conflict: {
    title: "Conflict-First Review",
    subtitle: "Potential divergence across layers is highlighted before supportive signals.",
    none: "No material conflicts detected across the current driver set.",
    low: "Low",
    medium: "Medium",
    high: "High",
    items: {
      flowTrend: "Orderflow and trend strength are not aligned.",
      biasSentiment: "Bias and sentiment point to different structural context.",
      eventPressure: "Event window pressure adds execution uncertainty.",
      fallbackQuality: "At least one ring uses fallback or stale quality context.",
    },
  },
  zones: {
    title: "Reference Zones",
    interaction: "Interaction Zone",
    invalidation: "Invalidation Zone",
    objective: "Objective Zone",
    unavailable: "n/a",
  },
  drivers: {
    title: "Weighted Driver View",
    trend: "Trend",
    bias: "Bias",
    sentiment: "Sentiment",
    orderflow: "Orderflow",
    event: "Event",
    confidence: "Confidence",
  },
  details: {
    titleMetrics: "Advanced Metrics",
    titleDefinitions: "Definitions",
    titleMetadata: "Snapshot Metadata",
    metrics: {
      setupGrade: "Setup grade",
      decisionClass: "Decision class",
      eventModifier: "Event modifier",
      riskRewardRatio: "Risk/Reward ratio",
    },
    metadata: {
      snapshotId: "Snapshot ID",
      snapshotLabel: "Snapshot label",
      engineVersion: "Engine version",
      generated: "Generated",
    },
    definitions: {
      alignment: "Alignment Index summarizes structural coherence across trend, bias, sentiment, and orderflow.",
      conflict: "Conflict Level highlights cross-signal tension and uncertainty concentration.",
      zones: "Reference Zones describe structural price regions and do not represent execution instructions.",
    },
  },
};

const DE_COPY: SetupV2Copy = {
  pageTitle: "Setup-Ansicht V2",
  statusHint: "Informative Modellausgabe. Keine Finanzberatung.",
  common: {
    na: "k. A.",
    none: "keine",
    asOf: "Stand",
    unknown: "unbekannt",
  },
  hero: {
    contextDirection: "Berechnete Kontext-Richtung",
    alignmentIndex: "Alignment-Index",
    conflictLevel: "Konfliktlevel",
    riskProfile: "Risikoprofil",
    asOf: "Stand",
  },
  context: {
    long: "Long-Kontext",
    short: "Short-Kontext",
    neutral: "Neutraler Kontext",
  },
  conflict: {
    title: "Konfliktorientierte Pruefung",
    subtitle: "Moegliche Divergenzen werden vor unterstuetzenden Signalen hervorgehoben.",
    none: "Keine wesentlichen Konflikte im aktuellen Driver-Set erkannt.",
    low: "Niedrig",
    medium: "Mittel",
    high: "Hoch",
    items: {
      flowTrend: "Orderflow und Trendstaerke sind nicht konsistent.",
      biasSentiment: "Bias und Sentiment zeigen in unterschiedliche Strukturkontexte.",
      eventPressure: "Event-Fenster erzeugt zusaetzliche Unsicherheit.",
      fallbackQuality: "Mindestens ein Ring nutzt Fallback- oder stale-Qualitaet.",
    },
  },
  zones: {
    title: "Referenzzonen",
    interaction: "Interaction Zone",
    invalidation: "Invalidation Zone",
    objective: "Objective Zone",
    unavailable: "k. A.",
  },
  drivers: {
    title: "Gewichtete Driver-Sicht",
    trend: "Trend",
    bias: "Bias",
    sentiment: "Sentiment",
    orderflow: "Orderflow",
    event: "Event",
    confidence: "Confidence",
  },
  details: {
    titleMetrics: "Erweiterte Metriken",
    titleDefinitions: "Definitionen",
    titleMetadata: "Snapshot-Metadaten",
    metrics: {
      setupGrade: "Setup-Grade",
      decisionClass: "Entscheidungsklasse",
      eventModifier: "Event-Modifikator",
      riskRewardRatio: "Chance/Risiko-Verhaeltnis",
    },
    metadata: {
      snapshotId: "Snapshot-ID",
      snapshotLabel: "Snapshot-Label",
      engineVersion: "Engine-Version",
      generated: "Erstellt",
    },
    definitions: {
      alignment: "Der Alignment-Index fasst die strukturelle Kohaerenz ueber Trend, Bias, Sentiment und Orderflow zusammen.",
      conflict: "Das Konfliktlevel markiert Spannungen zwischen Signal-Layern und Unsicherheitsclustern.",
      zones: "Referenzzonen beschreiben strukturelle Preisbereiche und sind keine Ausfuehrungsanweisung.",
    },
  },
};

export function getSetupV2Copy(locale: Locale): SetupV2Copy {
  return locale === "de" ? DE_COPY : EN_COPY;
}
