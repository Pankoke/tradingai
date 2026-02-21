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
    symbol: string;
    timeframe: string;
    contextDirection: string;
    alignmentIndex: string;
    conflictLevel: string;
    riskProfile: string;
    asOf: string;
    riskProfiles: {
      conservative: string;
      balanced: string;
      aggressive: string;
    };
    summaryLead: string;
    summaryStability: string;
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
    moderate: string;
    high: string;
    items: {
      flowTrend: string;
      biasSentiment: string;
      eventPressure: string;
      fallbackQuality: string;
    };
    stabilityNote: string;
  };
  zones: {
    title: string;
    subtitle: string;
    interaction: string;
    invalidation: string;
    objective: string;
    distanceRatio: string;
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
    intensity: {
      soft: string;
      moderate: string;
      strong: string;
    };
  };
  details: {
    titleMetrics: string;
    titleDefinitions: string;
    titleMetadata: string;
    metrics: {
      setupGrade: string;
      modelState: string;
      eventModifier: string;
      distanceRatio: string;
    };
    metadata: {
      snapshotId: string;
      snapshotLabel: string;
      engineVersion: string;
      generated: string;
    };
    modelStates: {
      active: string;
      monitoringPlus: string;
      monitoring: string;
      restricted: string;
      neutral: string;
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
    symbol: "Asset",
    timeframe: "Timeframe",
    contextDirection: "Context Direction",
    alignmentIndex: "Alignment Index",
    conflictLevel: "Conflict Level",
    riskProfile: "Risk Profile",
    asOf: "As-of",
    riskProfiles: {
      conservative: "Conservative",
      balanced: "Balanced",
      aggressive: "Aggressive",
    },
    summaryLead: "Structural summary:",
    summaryStability: "Current structure indicates a descriptive context state, not an outcome statement.",
  },
  context: {
    long: "Long Context",
    short: "Short Context",
    neutral: "Neutral Context",
  },
  conflict: {
    title: "Conflict-First Core",
    subtitle: "Structural divergence is shown before supportive drivers.",
    none: "No material conflict detected across current drivers.",
    low: "Low",
    moderate: "Moderate",
    high: "High",
    items: {
      flowTrend: "Orderflow and trend are directionally misaligned.",
      biasSentiment: "Bias and sentiment indicate different structural context.",
      eventPressure: "Event window pressure increases uncertainty.",
      fallbackQuality: "At least one ring relies on fallback or stale quality.",
    },
    stabilityNote: "Structural stability is lower when multiple layers diverge at the same time.",
  },
  zones: {
    title: "Structurally Relevant Price Zones",
    subtitle: "Structured level map without execution instructions.",
    interaction: "Interaction Zone",
    invalidation: "Invalidation Zone",
    objective: "Objective Zone",
    distanceRatio: "Structural Zone Ratio",
    unavailable: "n/a",
  },
  drivers: {
    title: "Structural Influence Factors",
    trend: "Trend",
    bias: "Bias",
    sentiment: "Sentiment",
    orderflow: "Orderflow",
    event: "Event",
    confidence: "Confidence",
    intensity: {
      soft: "soft",
      moderate: "moderate",
      strong: "strong",
    },
  },
  details: {
    titleMetrics: "Advanced Metrics",
    titleDefinitions: "Model Notes",
    titleMetadata: "Snapshot Metadata",
    metrics: {
      setupGrade: "Setup grade",
      modelState: "Model state",
      eventModifier: "Event modifier",
      distanceRatio: "Structural Zone Ratio",
    },
    metadata: {
      snapshotId: "Snapshot ID",
      snapshotLabel: "Snapshot label",
      engineVersion: "Engine version",
      generated: "Generated",
    },
    modelStates: {
      active: "Active context",
      monitoringPlus: "Monitoring plus",
      monitoring: "Monitoring",
      restricted: "Restricted context",
      neutral: "Neutral context",
    },
    definitions: {
      alignment: "Alignment Index summarizes structural coherence across trend, bias, sentiment, and orderflow.",
      conflict: "Conflict Level highlights tension concentration across signal layers.",
      zones: "Reference Zones mark structural price regions and remain descriptive.",
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
    symbol: "Asset",
    timeframe: "Zeitrahmen",
    contextDirection: "Kontext-Richtung",
    alignmentIndex: "Alignment-Index",
    conflictLevel: "Konfliktlevel",
    riskProfile: "Risikoprofil",
    asOf: "Stand",
    riskProfiles: {
      conservative: "Konservativ",
      balanced: "Ausgewogen",
      aggressive: "Dynamisch",
    },
    summaryLead: "Strukturelle Einordnung:",
    summaryStability: "Der aktuelle Aufbau beschreibt einen Kontextzustand, keine Ergebnisaussage.",
  },
  context: {
    long: "Long-Kontext",
    short: "Short-Kontext",
    neutral: "Neutraler Kontext",
  },
  conflict: {
    title: "Konfliktfokus",
    subtitle: "Strukturelle Divergenzen werden vor unterstuetzenden Treibern gezeigt.",
    none: "Keine wesentlichen Konflikte in den aktuellen Treibern erkannt.",
    low: "Niedrig",
    moderate: "Moderat",
    high: "Hoch",
    items: {
      flowTrend: "Orderflow und Trend sind richtungsseitig nicht konsistent.",
      biasSentiment: "Bias und Sentiment zeigen unterschiedliche Strukturkontexte.",
      eventPressure: "Event-Fenster erhoeht die Unsicherheit.",
      fallbackQuality: "Mindestens ein Ring nutzt Fallback- oder stale-Qualitaet.",
    },
    stabilityNote: "Die strukturelle Stabilitaet sinkt, wenn mehrere Layer gleichzeitig divergieren.",
  },
  zones: {
    title: "Strukturell relevante Preiszonen",
    subtitle: "Strukturierte Level-Karte ohne Ausfuehrungsanweisung.",
    interaction: "Interaction Zone",
    invalidation: "Invalidation Zone",
    objective: "Objective Zone",
    distanceRatio: "Strukturelles Verhaeltnis der Zonen",
    unavailable: "k. A.",
  },
  drivers: {
    title: "Strukturelle Einflussfaktoren",
    trend: "Trend",
    bias: "Bias",
    sentiment: "Sentiment",
    orderflow: "Orderflow",
    event: "Event",
    confidence: "Confidence",
    intensity: {
      soft: "niedrig",
      moderate: "moderat",
      strong: "ausgepraegt",
    },
  },
  details: {
    titleMetrics: "Erweiterte Metriken",
    titleDefinitions: "Modelhinweise",
    titleMetadata: "Snapshot-Metadaten",
    metrics: {
      setupGrade: "Setup-Grade",
      modelState: "Modelzustand",
      eventModifier: "Event-Modifikator",
      distanceRatio: "Strukturelles Verhaeltnis der Zonen",
    },
    metadata: {
      snapshotId: "Snapshot-ID",
      snapshotLabel: "Snapshot-Label",
      engineVersion: "Engine-Version",
      generated: "Erstellt",
    },
    modelStates: {
      active: "Aktiver Kontext",
      monitoringPlus: "Monitoring plus",
      monitoring: "Monitoring",
      restricted: "Eingeschraenkter Kontext",
      neutral: "Neutraler Kontext",
    },
    definitions: {
      alignment: "Der Alignment-Index fasst die strukturelle Kohaerenz ueber Trend, Bias, Sentiment und Orderflow zusammen.",
      conflict: "Das Konfliktlevel zeigt, wie stark Spannungen zwischen Signal-Layern gebuendelt sind.",
      zones: "Referenzzonen markieren strukturelle Preisbereiche und bleiben deskriptiv.",
    },
  },
};

export function getSetupV2Copy(locale: Locale): SetupV2Copy {
  return locale === "de" ? DE_COPY : EN_COPY;
}
