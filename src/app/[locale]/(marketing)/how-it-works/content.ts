import type { Locale } from "@/src/lib/i18n/config";

export type TocItem = {
  id: string;
  label: string;
};

export type PipelineStep = {
  id: string;
  title: string;
  bullets: string[];
  output: string;
};

export type DataSourceItem = {
  id: string;
  title: string;
  summary: string;
  whatItIs: string;
  usedFor: string;
  quality: string;
};

export type ProfileCard = {
  id: string;
  title: string;
  timeframe: string;
  purpose: string;
  holding: string;
  scoring: string;
  freshness: string;
};

export type LevelConcept = {
  title: string;
  description: string;
};

export type RingItem = {
  id: string;
  name: string;
  meaning: string;
  inputs: string;
  interpretation: string;
  quality: string;
};

export type RankingExample = {
  id: string;
  label: string;
  score: number;
  highlight?: boolean;
  badge?: string;
};

export type ExampleStep = {
  id: string;
  title: string;
  description: string;
  note?: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type PageContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroHighlights: string[];
  tocLabel: string;
  mobileTocLabel: string;
  tocItems: TocItem[];
  labels: {
    step: string;
    snapshot: string;
    output: string;
    score: string;
    example: string;
  };
  pipelineTitle: string;
  pipelineIntro: string;
  pipelineSteps: PipelineStep[];
  dataSourcesTitle: string;
  dataSourcesIntro: string;
  dataSourcesLabels: {
    what: string;
    usedFor: string;
    quality: string;
  };
  dataSources: DataSourceItem[];
  profilesTitle: string;
  profilesIntro: string;
  profileLabels: {
    holding: string;
    scoring: string;
    freshness: string;
  };
  profiles: ProfileCard[];
  levelsTitle: string;
  levelsIntro: string;
  levelConcepts: LevelConcept[];
  levelDiagramLabels: {
    diagramTitle: string;
    entry: string;
    stop: string;
    tp1: string;
    tp2: string;
    rrr: string;
    exampleTag: string;
    ruleNote: string;
  };
  rrrLine: string;
  ringsTitle: string;
  ringsIntro: string;
  ringLabels: {
    meaning: string;
    inputs: string;
    interpretation: string;
    quality: string;
  };
  rings: RingItem[];
  ringsQualityNote: string;
  rankingTitle: string;
  rankingIntro: string;
  rankingListTitle: string;
  rankingExamples: RankingExample[];
  exampleTitle: string;
  exampleIntro: string;
  exampleSteps: ExampleStep[];
  exampleEventNote: string;
  faqTitle: string;
  faqIntro: string;
  faqItems: FaqItem[];
  transparencyAnchorLabel: string;
};

const content: Record<Locale, PageContent> = {
  de: {
    heroTitle: "How TradingAI works",
    heroSubtitle:
      "Das Perception Lab liefert Entscheidungs-Unterstützung: strukturierte Setups mit klaren Levels, Scorings und Kontext. Keine Handels­empfehlung, sondern Transparenz darüber, was die Engine sieht.",
    heroHighlights: [
      "Snapshots je Marktphase",
      "Rings 0–100 je Signal",
      "Entry / SL / TP regelbasiert",
      "Event-aware Execution",
      "Transparenz & Fallbacks",
    ],
    tocLabel: "Auf dieser Seite",
    mobileTocLabel: "Inhalt",
    tocItems: [
      { id: "pipeline", label: "Pipeline in 5 Schritten" },
      { id: "data-sources", label: "Datenquellen" },
      { id: "profiles", label: "Profile & Timeframes" },
      { id: "levels", label: "Levels & Risiko" },
      { id: "rings", label: "Rings 0–100" },
      { id: "ranking", label: "Ranking & Setup of the Day" },
      { id: "example", label: "Beispiel: Gold (XAUUSD)" },
      { id: "faq", label: "Transparenz & Verantwortung" },
    ],
    labels: {
      step: "Schritt",
      snapshot: "Snapshot",
      output: "Ergebnis",
      score: "Score",
      example: "Beispiel",
    },
    pipelineTitle: "Pipeline in 5 Schritten",
    pipelineIntro:
      "Jeder Snapshot fasst Signale, Events und Marktstruktur zusammen. Die Engine folgt einer festen Reihenfolge, damit Ergebnisse nachvollziehbar bleiben.",
    pipelineSteps: [
      {
        id: "step-1",
        title: "Daten sammeln",
        bullets: [
          "Preisreihen, Volatilität, Events und Sentiment-Ströme einlesen",
          "Universum filtern nach Liquidität und Mindest-Historie",
          "Fallback-Regeln aktivieren, falls Streams fehlen",
        ],
        output: "Bereinigte Datenbasis je Asset und Profil",
      },
      {
        id: "step-2",
        title: "Marktmetriken berechnen",
        bullets: [
          "Trend, Volatilität, ATR, Schlüssel-Levels (Range/Impulse)",
          "Events nach Impact und Nähe zum Entry mappen",
          "Bias- und Sentiment-Indikatoren normalisieren",
        ],
        output: "Normalisierte Metriken mit Zeitstempeln",
      },
      {
        id: "step-3",
        title: "Levels bauen",
        bullets: [
          "Entry-Zone als Spannbreite statt Punktziel",
          "Stop-Loss unter/über Strukturen und Liquiditäts-Pockets",
          "Take-Profit in Stufen mit realistischem RRR",
        ],
        output: "Entry/SL/TP-Set inkl. RRR-Basis",
      },
      {
        id: "step-4",
        title: "Rings berechnen",
        bullets: [
          "Trend-, Bias-, Event-, Sentiment-, Orderflow-Scores (0–100)",
          "Confidence als gewichteter Mix inkl. Qualität",
          "Fallback-Flags, falls Daten stale oder heuristisch",
        ],
        output: "Rings mit Qualitätsstatus",
      },
      {
        id: "step-5",
        title: "Ranking & Setup of the Day",
        bullets: [
          "Alle Setups nach Profil sortieren und filtern",
          "Top-Score pro Snapshot wird Setup of the Day",
          "Schwache Signale werden markiert statt versteckt",
        ],
        output: "Ranking je Snapshot + Highlight",
      },
    ],
    dataSourcesTitle: "Datenquellen",
    dataSourcesIntro:
      "Jede Quelle hat einen klaren Zweck. Bei Störungen greift eine definierte Fallback-Strategie, damit Transparenz gewahrt bleibt.",
    dataSourcesLabels: {
      what: "Was es ist",
      usedFor: "Wofür genutzt",
      quality: "Qualität / Fallback",
    },
    dataSources: [
      {
        id: "candles",
        title: "Candles & Marktstruktur",
        summary: "OHLCV, ATR, Range-/Impulse-Erkennung",
        whatItIs: "Preis- und Volatilitätsbasis mit bereinigten Ausreißern.",
        usedFor: "Trend, Entry-Zone-Spannbreite, Stop/TP-Ankerpunkte.",
        quality: "Fallback: längere Historie mit niedrigerer Auflösung; Markierung als 'stale', falls keine frischen Kerzen.",
      },
      {
        id: "assets",
        title: "Assets & Universum",
        summary: "Liquidität, Handelbarkeit, Session-Infos",
        whatItIs: "Liste zulässiger Symbole pro Profil und Region.",
        usedFor: "Filtert illiquide Märkte, wählt passende Sessions für Events.",
        quality: "Fallback: Universum schrumpft; keine Berechnung statt Raten.",
      },
      {
        id: "events",
        title: "Events",
        summary: "Makro, Krypto, Unternehmens-Events inkl. Impact",
        whatItIs: "Terminkalender mit Zeit, Relevanz und betroffenen Assets.",
        usedFor: "Event-Ring, Anpassung von Entry/SL rund um Veröffentlichungen.",
        quality: "Fallback: historische Event-Schemen; Flag 'fallback' im Ring.",
      },
      {
        id: "bias",
        title: "Bias",
        summary: "Strukturelle Richtung pro Profil",
        whatItIs: "Mix aus Trend, Marktdruck und Higher-Timeframe-Kontext.",
        usedFor: "Long/Short-Präferenz, Filter für schwache Setups.",
        quality: "Fallback: reiner Preis-Trend ohne Kontext.",
      },
      {
        id: "sentiment",
        title: "Sentiment",
        summary: "News- und Social-Signale, aggregiert",
        whatItIs: "Textsignale nach Relevanz und Tonalität normalisiert.",
        usedFor: "Sentiment-Ring, Warnung bei extremen Divergenzen.",
        quality: "Fallback: zuletzt bekannte Werte mit 'stale'-Flag.",
      },
      {
        id: "orderflow",
        title: "Orderflow / Positionierung",
        summary: "Futures/Perps Funding, COT, Open Interest",
        whatItIs: "Fluss- und Positionierungsdaten je Asset.",
        usedFor: "Orderflow-Ring, Validierung gegen Bias.",
        quality: "Fallback: Heuristik aus Volumen & Volatilität; als heuristisch markiert.",
      },
    ],
    profilesTitle: "Profile & Timeframes",
    profilesIntro:
      "Jedes Profil erzwingt andere Haltedauern, Level-Breiten und Scoring-Gewichte. So bleibt ein Swing-Setup anders als ein Intraday-Setup.",
    profileLabels: {
      holding: "Haltezeit",
      scoring: "Scoring",
      freshness: "Datenfrische",
    },
    profiles: [
      {
        id: "swing",
        title: "SWING",
        timeframe: "1D",
        purpose: "Mehrtagige Moves mit klarer Struktur",
        holding: "Typisch: mehrere Tage bis Wochen",
        scoring: "Trend und Event-Gewicht höher, Sentiment geglättet",
        freshness: "Snapshot 1x/Tag, Events laufend nachgezogen",
      },
      {
        id: "intraday",
        title: "INTRADAY",
        timeframe: "1H / 4H",
        purpose: "Kurzfristige Bewegungen innerhalb eines Tages",
        holding: "Stunden bis 2 Tage",
        scoring: "Event-Nähe stärker, Entry-Zonen enger, RRR konservativ",
        freshness: "Snapshot mehrmals/Tag; stale-Markierung ab 4h ohne Update",
      },
      {
        id: "position",
        title: "POSITION",
        timeframe: "1W",
        purpose: "Längere Makro-Trades mit robusten Levels",
        holding: "Wochen bis Monate",
        scoring: "Bias und Orderflow dominieren, Event-Einfluss gedämpft",
        freshness: "Wöchentliches Re-Fit; Events nur wenn hochrelevant",
      },
    ],
    levelsTitle: "Levels & Risiko",
    levelsIntro:
      "Entry, Stop und Take-Profit werden regelbasiert aus Struktur und Volatilitaet abgeleitet. Kein geratenes 'AI-Level', sondern reproduzierbare Logik.",
    levelDiagramLabels: {
      diagramTitle: "Levels (Beispiel)",
      entry: "Entry-Zone",
      stop: "Stop-Loss",
      tp1: "Take-Profit 1",
      tp2: "Take-Profit 2",
      rrr: "RRR & Risiko",
      exampleTag: "Beispiel",
      ruleNote: "Regelbasiert aus Struktur, nicht geraten.",
    },
    levelConcepts: [
      {
        title: "Entry-Zone",
        description: "Band statt Punkt. Kombiniert Marktstruktur mit ATR, damit Einstiege nicht millimetergenau sein muessen.",
      },
      {
        title: "Stop-Loss",
        description: "Unter/ueber markanten Liquidity-Pools oder Strukturen. Anpassung, falls Event-Risiko hoch.",
      },
      {
        title: "Take-Profit",
        description: "Mehrstufig (TP1/TP2) entlang von Range-Kanten oder Zielzonen, um Teilverkaeufe zu ermoeglichen.",
      },
      {
        title: "Risk/Reward",
        description: "Berechnet aus Entry-Band vs. SL/TP. Klar sichtbar als Prozentsatz und RRR.",
      },
    ],
    rrrLine:
      "Beispielhafte RRR-Berechnung: Risiko 1,0 % bis SL vs. Chance 2,5 % bis TP1 und 4,0 % bis TP2 => RRR ~ 1:2,5 / 1:4,0.",
    ringsTitle: "Rings 0–100",
    ringsIntro:
      "Rings zeigen, wie robust ein Signal ist. Jeder Ring misst ein anderes Segment der Engine und trägt einen Qualitätsstatus.",
    ringLabels: {
      meaning: "Bedeutung",
      inputs: "Typische Inputs",
      interpretation: "Einordnung",
      quality: "Qualitaet",
    },
    rings: [
      {
        id: "trend",
        name: "Trend",
        meaning: "Wie sauber ist die aktuelle Preisstruktur?",
        inputs: "MA-Slope, HH/LL-Sequenz, Volatilität",
        interpretation: "Hoch = klarer Trend, Niedrig = Chop/Range",
        quality: "Heuristisch, falls zu wenig Historie oder Sprünge",
      },
      {
        id: "bias",
        name: "Bias",
        meaning: "Richtungspräferenz je Profil",
        inputs: "HTF-Trend, Marktbreite, Strukturdruck",
        interpretation: "Über 55 = bullisch, unter 45 = bärisch, dazwischen neutral",
        quality: "Fallback auf Trend, wenn Bias-Daten fehlen",
      },
      {
        id: "event",
        name: "Event",
        meaning: "Einfluss naher Termine",
        inputs: "Kalender-Impact, Zeit bis Event, Korrelation",
        interpretation: "70+ = Execution kritisch, 40–70 = moderat",
        quality: "Fallback auf historische Event-Profile",
      },
      {
        id: "sentiment",
        name: "Sentiment",
        meaning: "News- und Social-Tonlage",
        inputs: "Relevanzgewichtete Texte, Divergenz zum Preis",
        interpretation: "Positiv/Negativ je nach Ton, Extremwerte = Vorsicht",
        quality: "Stale, wenn letzte Aktualisierung > X Stunden",
      },
      {
        id: "orderflow",
        name: "Orderflow",
        meaning: "Fluss- und Positionierungsdaten",
        inputs: "Funding, OI, COT, Spot/Perps Delta",
        interpretation: "Balance vs. einseitige Positionierung",
        quality: "Heuristik, wenn nur Volumen/ATR verfügbar",
      },
      {
        id: "confidence",
        name: "Confidence",
        meaning: "Gesamtvertrauen in das Setup",
        inputs: "Gewichteter Mix aller Rings + Datenqualität",
        interpretation: "Über 70 = stark, 50–70 = moderat, unter 50 = schwach",
        quality: "Reduziert, wenn mehrere Quellen fallback/stale sind",
      },
    ],
    ringsQualityNote:
      "Datenqualität: live = frisch, derived = abgeleitet, heuristic = Abschätzung, fallback = Ersatzquelle, stale = älter als geplant. Details unter Transparenz.",
    rankingTitle: "Ranking & Setup of the Day",
    rankingIntro:
      "Alle Setups werden innerhalb eines Snapshots gerankt. Das beste (nach Confidence und Filterkriterien) wird als „Setup of the Day“ hervorgehoben.",
    rankingListTitle: "Mock: Ranking innerhalb eines Snapshots",
    rankingExamples: [
      { id: "rank-1", label: "XAUUSD — Swing", score: 86, highlight: true, badge: "Setup of the Day" },
      { id: "rank-2", label: "EURUSD — Intraday", score: 78 },
      { id: "rank-3", label: "BTCUSD — Intraday", score: 72 },
      { id: "rank-4", label: "NVDA — Position", score: 68 },
    ],
    exampleTitle: "Worked Example: Gold (XAUUSD)",
    exampleIntro:
      "Fiktives Beispiel mit Platzhalterwerten. Es zeigt, wie ein Snapshot aufgebaut wird – keine Handelsidee.",
    exampleSteps: [
      {
        id: "ex-1",
        title: "Referenzpreis setzen",
        description: "Spotpreis 2.040 USD als Ausgangspunkt (Beispielwert).",
      },
      {
        id: "ex-2",
        title: "Marktmetriken",
        description: "ATR (1D) = 24 USD, Trend steigend, Range-Hoch 2.055, -Tief 2.010.",
      },
      {
        id: "ex-3",
        title: "Levels",
        description: "Entry-Zone 2.032–2.038, SL 2.012, TP1 2.060, TP2 2.085 (Beispiele).",
      },
      {
        id: "ex-4",
        title: "Bias",
        description: "Bias-Ring 64: bullischer Kontext durch HTF-Trend und Marktbreite.",
      },
      {
        id: "ex-5",
        title: "Events",
        description: "Nächster CPI in 18h, Impact hoch ⇒ Event-Ring 72.",
        note: "Execution critical: Entry nur fernab der Veröffentlichung oder mit reduzierter Positionsgröße.",
      },
      {
        id: "ex-6",
        title: "Sentiment",
        description: "Aggregiertes Sentiment leicht positiv (56) mit moderater Relevanz.",
      },
      {
        id: "ex-7",
        title: "Orderflow",
        description: "Futures-Funding neutral, OI steigt leicht ⇒ Orderflow-Ring 58.",
      },
      {
        id: "ex-8",
        title: "Confidence & Ranking",
        description: "Confidence 74 nach Datenqualität. Snapshot-Ranking: Platz 1 ⇒ Setup of the Day (Beispiel).",
      },
    ],
    exampleEventNote: "Execution-kritisches Event: Falls Event-Daten ausfallen, wird der Event-Ring als 'fallback' markiert und Confidence sinkt sichtbar.",
    faqTitle: "Transparenz & Verantwortung",
    faqIntro: "Häufige Fragen rund um Bedeutung, Aktualisierung und Fallbacks.",
    faqItems: [
      {
        id: "faq-1",
        question: "Ist das eine Handels-Empfehlung?",
        answer: "Nein. Die Setups sind Entscheidungshilfe. Eigene Prüfung, Risiko-Management und Ausführung bleiben deine Verantwortung.",
      },
      {
        id: "faq-2",
        question: "Was bedeutet 0–100 bei Rings?",
        answer: "0–100 skaliert von sehr schwach bis sehr stark. 50 ist neutral. Qualitative Flags zeigen, ob Daten live, abgeleitet oder fallback sind.",
      },
      {
        id: "faq-3",
        question: "Warum kann ein Ring 'fallback' sein?",
        answer: "Wenn eine Quelle fehlt oder verzögert ist, nutzt die Engine definierte Ersatzlogik. Der Ring wird sichtbar als fallback markiert.",
      },
      {
        id: "faq-4",
        question: "Was heißt 'execution critical'?",
        answer: "Events mit hohem Impact, die Entry/SL/TP beeinflussen können. Markiert im Event-Ring; oft Empfehlung zu warten oder Größe zu senken.",
      },
      {
        id: "faq-5",
        question: "Warum erscheint manchmal kein Setup?",
        answer: "Wenn Datenlücken, extreme Unsicherheit oder widersprüchliche Signale vorliegen, wird kein Setup gezeigt statt zu raten.",
      },
      {
        id: "faq-6",
        question: "Wie oft werden Snapshots aktualisiert?",
        answer: "Intraday mehrfach, Swing täglich, Position wöchentlich. Events können untertägig Anpassungen auslösen.",
      },
      {
        id: "faq-7",
        question: "Was passiert, wenn der Event-Feed ausfällt?",
        answer: "Event-Ring wechselt auf fallback, Confidence sinkt. Setup bleibt sichtbar, aber mit Warnhinweis.",
      },
      {
        id: "faq-8",
        question: "Was ist 'stale data'?",
        answer: "Daten älter als die definierte Frische-Grenze. Sie werden markiert und schwächen Confidence.",
      },
      {
        id: "faq-9",
        question: "Wie messen wir Performance?",
        answer:
          "Wir werten nur handelbare Setups (Grade A/B) aus. NO_TRADE ist eine bewusste Entscheidung und zählt nicht als Verlust. Win-Rate allein genügt nicht: Expired/Open zeigen, ob das Beobachtungsfenster lang genug war.",
      },
    ],
    transparencyAnchorLabel: "Zur Transparenz-Sektion springen",
  },
  en: {
    heroTitle: "How TradingAI works",
    heroSubtitle:
      "The Perception Lab is decision-support: structured setups with levels, scoring, and context. Not financial advice, but a transparent view of what the engine sees.",
    heroHighlights: [
      "Snapshots per market profile",
      "Rings 0–100 per signal",
      "Entry / SL / TP are rule-based",
      "Event-aware execution",
      "Transparency & fallbacks",
    ],
    tocLabel: "On this page",
    mobileTocLabel: "Contents",
    tocItems: [
      { id: "pipeline", label: "Pipeline in 5 steps" },
      { id: "data-sources", label: "Data sources" },
      { id: "profiles", label: "Profiles & timeframes" },
      { id: "levels", label: "Levels & risk" },
      { id: "rings", label: "Rings 0–100" },
      { id: "ranking", label: "Ranking & Setup of the Day" },
      { id: "example", label: "Example: Gold (XAUUSD)" },
      { id: "faq", label: "Transparency & responsibility" },
    ],
    labels: {
      step: "Step",
      snapshot: "Snapshot",
      output: "Output",
      score: "Score",
      example: "Example",
    },
    pipelineTitle: "Pipeline in 5 steps",
    pipelineIntro:
      "Each snapshot packages signals, events, and structure. The engine follows a fixed sequence so outputs remain explainable.",
    pipelineSteps: [
      {
        id: "step-1",
        title: "Collect data",
        bullets: [
          "Ingest price, volatility, events, sentiment/flow streams",
          "Filter universe by liquidity and minimum history",
          "Activate fallback rules if streams are missing",
        ],
        output: "Cleaned data foundation per asset and profile",
      },
      {
        id: "step-2",
        title: "Compute market metrics",
        bullets: [
          "Trend, volatility, ATR, range/impulse structure",
          "Map events by impact and proximity to entry",
          "Normalize bias and sentiment indicators",
        ],
        output: "Normalized metrics with timestamps",
      },
      {
        id: "step-3",
        title: "Build levels",
        bullets: [
          "Entry zone is a band, not a pin-point",
          "Stop-loss beneath/above structure and liquidity pockets",
          "Take-profit ladder with realistic risk/reward",
        ],
        output: "Entry/SL/TP set including RRR base",
      },
      {
        id: "step-4",
        title: "Compute rings",
        bullets: [
          "Trend, Bias, Event, Sentiment, Orderflow scores (0–100)",
          "Confidence as weighted mix including quality",
          "Fallback flags if data is stale or heuristic",
        ],
        output: "Rings with quality status",
      },
      {
        id: "step-5",
        title: "Rank & pick Setup of the Day",
        bullets: [
          "Sort setups per profile and apply filters",
          "Top score per snapshot becomes Setup of the Day",
          "Weak signals are shown as such rather than hidden",
        ],
        output: "Ranking per snapshot + highlight",
      },
    ],
    dataSourcesTitle: "Data sources",
    dataSourcesIntro:
      "Each source has a defined purpose. When a feed degrades, a fallback strategy keeps transparency intact.",
    dataSourcesLabels: {
      what: "What it is",
      usedFor: "Used for",
      quality: "Quality / fallback",
    },
    dataSources: [
      {
        id: "candles",
        title: "Candles & structure",
        summary: "OHLCV, ATR, range/impulse detection",
        whatItIs: "Price and volatility backbone with cleaned outliers.",
        usedFor: "Trend, entry-band width, stop/TP anchor points.",
        quality: "Fallback: longer history at lower resolution; marked as stale if candles lag.",
      },
      {
        id: "assets",
        title: "Assets & universe",
        summary: "Liquidity, tradability, session info",
        whatItIs: "List of allowed symbols per profile and region.",
        usedFor: "Filters illiquid markets, selects correct sessions for events.",
        quality: "Fallback: universe shrinks; no guessing if data is missing.",
      },
      {
        id: "events",
        title: "Events",
        summary: "Macro, crypto, earnings with impact scores",
        whatItIs: "Calendar with time, relevance, and affected assets.",
        usedFor: "Event ring and entry/SL adjustments around releases.",
        quality: "Fallback: historical event patterns; ring marked as fallback.",
      },
      {
        id: "bias",
        title: "Bias",
        summary: "Structural direction per profile",
        whatItIs: "Blend of trend, market pressure, and higher timeframe context.",
        usedFor: "Long/short preference and filter for weak setups.",
        quality: "Fallback: pure price trend if bias data is missing.",
      },
      {
        id: "sentiment",
        title: "Sentiment",
        summary: "News and social signals, aggregated",
        whatItIs: "Text signals normalized by relevance and tonality.",
        usedFor: "Sentiment ring and warning on extreme divergences.",
        quality: "Fallback: last known value marked as stale.",
      },
      {
        id: "orderflow",
        title: "Orderflow / positioning",
        summary: "Futures/Perps funding, COT, open interest",
        whatItIs: "Flow and positioning data per asset.",
        usedFor: "Orderflow ring and validation against bias.",
        quality: "Fallback: heuristic from volume & volatility, flagged as such.",
      },
    ],
    profilesTitle: "Profiles & timeframes",
    profilesIntro:
      "Profiles enforce holding periods, level widths, and scoring weights. A swing setup behaves differently from intraday by design.",
    profileLabels: {
      holding: "Holding",
      scoring: "Scoring",
      freshness: "Freshness",
    },
    profiles: [
      {
        id: "swing",
        title: "SWING",
        timeframe: "1D",
        purpose: "Multi-day moves with clear structure",
        holding: "Typical: several days to weeks",
        scoring: "Trend and event weight higher, sentiment smoothed",
        freshness: "Snapshot daily; events roll in continuously",
      },
      {
        id: "intraday",
        title: "INTRADAY",
        timeframe: "1H / 4H",
        purpose: "Short-term moves inside a day",
        holding: "Hours to two days",
        scoring: "Event proximity matters more, tighter entry bands, conservative RRR",
        freshness: "Snapshot multiple times per day; marked stale after 4h without update",
      },
      {
        id: "position",
        title: "POSITION",
        timeframe: "1W",
        purpose: "Longer macro trades with sturdy levels",
        holding: "Weeks to months",
        scoring: "Bias and orderflow dominate, event impact dampened",
        freshness: "Weekly re-fit; only high-impact events adjust it",
      },
    ],
    levelsTitle: "Levels & risk",
    levelsIntro:
      "Entry, stop, and take-profit are rule-based from structure and volatility. No opaque 'AI lines' -- the derivation is reproducible.",
    levelDiagramLabels: {
      diagramTitle: "Levels (example)",
      entry: "Entry zone",
      stop: "Stop-loss",
      tp1: "Take-profit 1",
      tp2: "Take-profit 2",
      rrr: "RRR & risk",
      exampleTag: "Example",
      ruleNote: "Rule-based from structure, never random guesses.",
    },
    levelConcepts: [
      {
        title: "Entry zone",
        description: "Band instead of a single tick. Combines structure and ATR so fills can vary without breaking the plan.",
      },
      {
        title: "Stop-loss",
        description: "Placed beyond key liquidity/structure. Adjusted if events raise execution risk.",
      },
      {
        title: "Take-profit",
        description: "Layered (TP1/TP2) along ranges or targets to allow scaling out.",
      },
      {
        title: "Risk/Reward",
        description: "Derived from entry band vs. SL/TP. Shown clearly as percentages and RRR.",
      },
    ],
    rrrLine:
      "Example RRR: 1.0% risk to SL vs. 2.5% to TP1 and 4.0% to TP2 => RRR ~ 1:2.5 / 1:4.0.",
    ringsTitle: "Rings 0–100",
    ringsIntro:
      "Rings show robustness of a signal. Each ring measures a specific slice of the engine and carries a quality state.",
    ringLabels: {
      meaning: "Meaning",
      inputs: "Inputs",
      interpretation: "Interpretation",
      quality: "Quality",
    },
    rings: [
      {
        id: "trend",
        name: "Trend",
        meaning: "How clean is the current structure?",
        inputs: "MA slope, HH/LL sequence, volatility",
        interpretation: "High = trending, Low = chop/range",
        quality: "Heuristic if history is thin or jumpy",
      },
      {
        id: "bias",
        name: "Bias",
        meaning: "Directional preference per profile",
        inputs: "HTF trend, breadth, structural pressure",
        interpretation: "Above 55 = bullish, below 45 = bearish, between = neutral",
        quality: "Falls back to trend if bias data is missing",
      },
      {
        id: "event",
        name: "Event",
        meaning: "Influence of nearby releases",
        inputs: "Calendar impact, time-to-event, correlation",
        interpretation: "70+ = execution critical, 40–70 = moderate",
        quality: "Fallback to historical event patterns",
      },
      {
        id: "sentiment",
        name: "Sentiment",
        meaning: "News and social tone",
        inputs: "Relevance-weighted text, divergence to price",
        interpretation: "Positive/negative depending on tone; extremes warn",
        quality: "Stale when last update exceeds the freshness window",
      },
      {
        id: "orderflow",
        name: "Orderflow",
        meaning: "Flow and positioning",
        inputs: "Funding, OI, COT, spot/perps delta",
        interpretation: "Balance vs. one-sided positioning",
        quality: "Heuristic if only volume/ATR is available",
      },
      {
        id: "confidence",
        name: "Confidence",
        meaning: "Overall trust in the setup",
        inputs: "Weighted mix of all rings plus data quality",
        interpretation: "70+ strong, 50–70 moderate, below 50 weak",
        quality: "Reduced if several sources are fallback/stale",
      },
    ],
    ringsQualityNote:
      "Data quality tags: live = fresh, derived = calculated, heuristic = estimated, fallback = substitute source, stale = older than planned. See transparency section.",
    rankingTitle: "Ranking & Setup of the Day",
    rankingIntro:
      "Every setup in a snapshot is ranked. The best (after filters) becomes the “Setup of the Day” and is highlighted.",
    rankingListTitle: "Mock: ranking inside one snapshot",
    rankingExamples: [
      { id: "rank-1", label: "XAUUSD — Swing", score: 86, highlight: true, badge: "Setup of the Day" },
      { id: "rank-2", label: "EURUSD — Intraday", score: 78 },
      { id: "rank-3", label: "BTCUSD — Intraday", score: 72 },
      { id: "rank-4", label: "NVDA — Position", score: 68 },
    ],
    exampleTitle: "Worked example: Gold (XAUUSD)",
    exampleIntro:
      "Fictional, placeholder numbers. Demonstrates how a snapshot is assembled – not a trade idea.",
    exampleSteps: [
      {
        id: "ex-1",
        title: "Set reference price",
        description: "Spot at 2,040 USD as the starting point (example).",
      },
      {
        id: "ex-2",
        title: "Market metrics",
        description: "ATR (1D) = 24 USD, trend up, range high 2,055, low 2,010.",
      },
      {
        id: "ex-3",
        title: "Levels",
        description: "Entry zone 2,032–2,038, SL 2,012, TP1 2,060, TP2 2,085 (examples).",
      },
      {
        id: "ex-4",
        title: "Bias",
        description: "Bias ring 64: bullish context from HTF trend and breadth.",
      },
      {
        id: "ex-5",
        title: "Events",
        description: "Next CPI in 18h, high impact ⇒ Event ring 72.",
        note: "Execution critical: entries away from the release or with reduced size.",
      },
      {
        id: "ex-6",
        title: "Sentiment",
        description: "Aggregated sentiment slightly positive (56) with moderate relevance.",
      },
      {
        id: "ex-7",
        title: "Orderflow",
        description: "Futures funding neutral, OI climbing slightly ⇒ Orderflow ring 58.",
      },
      {
        id: "ex-8",
        title: "Confidence & ranking",
        description: "Confidence 74 after quality adjustments. Ranking: #1 ⇒ Setup of the Day (example).",
      },
    ],
    exampleEventNote:
      "Execution-critical event: if the event feed fails, the Event ring is marked fallback and confidence is reduced visibly.",
    faqTitle: "Transparency & responsibility",
    faqIntro: "Key questions about meaning, updates, and fallbacks.",
    faqItems: [
      {
        id: "faq-1",
        question: "Is this financial advice?",
        answer: "No. Setups are decision-support. You remain responsible for evaluation, risk, and execution.",
      },
      {
        id: "faq-2",
        question: "What does 0–100 mean?",
        answer: "0–100 scales from very weak to very strong. 50 is neutral. Quality tags show whether data is live, derived, or fallback.",
      },
      {
        id: "faq-3",
        question: "Why can a ring be fallback?",
        answer: "If a source is missing or delayed, the engine uses a defined substitute logic. The ring is marked as fallback.",
      },
      {
        id: "faq-4",
        question: "What is “execution critical”?",
        answer: "High-impact events that can move entry/SL/TP. Marked on the Event ring; often implies waiting or reducing size.",
      },
      {
        id: "faq-5",
        question: "Why do no setups show sometimes?",
        answer: "If data gaps, extreme uncertainty, or conflicting signals occur, the engine prefers no setup over guessing.",
      },
      {
        id: "faq-6",
        question: "How often do snapshots update?",
        answer: "Intraday multiple times, swing daily, position weekly. Events can trigger intra-day adjustments.",
      },
      {
        id: "faq-7",
        question: "What if the events table is unavailable?",
        answer: "Event ring switches to fallback and confidence drops. The setup stays visible but warned.",
      },
      {
        id: "faq-8",
        question: "What counts as stale data?",
        answer: "Data older than its freshness window. It is flagged and lowers confidence.",
      },
      {
        id: "faq-9",
        question: "How do you measure performance?",
        answer:
          "Only tradable setups (Grades A/B) are counted in win rate. NO_TRADE is a deliberate filter, not a loss. Win rate alone is not enough: expired/open show whether the observation window was long enough.",
      },
    ],
    transparencyAnchorLabel: "Jump to transparency section",
  },
};

export function getContent(locale: Locale): PageContent {
  return content[locale] ?? content.de;
}
