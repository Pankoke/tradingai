ARCHITEKTUR – IST / SOLL
VERSION 1 (AGENTENMODUS – REFERENZDOKUMENT)

================================================================
ZWECK UND EINORDNUNG

Dieses Dokument beschreibt die Architektur von TradingAI in zwei Perspektiven:

IST-Architektur
Wie das System aktuell strukturiert ist, inklusive realer Kopplungen
und impliziter Abhängigkeiten.

SOLL-Architektur
Ein Zielbild, das:

Domain-getrennt

deterministisch

testbar

backtesting-fähig
ist, ohne bestehende Funktionalität zu brechen.

Dieses Dokument ist:

KEIN Implementierungsplan

KEINE Roadmap

SONDERN die architektonische Wahrheit (Single Source of Truth)

================================================================
SYSTEMÜBERBLICK (IST)

TradingAI ist eine Next.js-Anwendung (App Router) mit:

striktem TypeScript

serverseitiger Datenverarbeitung (Cron + API)

umfangreicher Strategy / Perception Engine

Fokus auf:

Event-basiertes Trading

Multi-Asset (Crypto, Gold, Indizes)

Intraday & Swing

Die Architektur ist funktional weit entwickelt, aber:

historisch gewachsen

stellenweise stark gekoppelt

schwer deterministisch reproduzierbar

================================================================
IST-ARCHITEKTUR – DETAILANALYSE

MARKET DATA (IST)

RELEVANTE ORTE IM CODE:

src/server/providers/

src/server/marketData/

src/server/repositories/candleRepository.ts

src/server/db/schema/candles.ts

src/server/db/schema/assets.ts

FUNKTIONALE VERANTWORTUNG:

Fetch von Candle-Daten (primär Klines)

Teilweise Aggregation (z. B. 4H derived aus 1H)

Persistenz in Postgres (Drizzle)

Provider-Fallbacks

AKTUELLE STÄRKEN:

Funktionierende Datenpipeline

Gute Typisierung im DB-Schema

Derived-Candles bereits vorhanden (source = "derived")

PROBLEME / RISIKEN:

Fetch, Normalisierung, Aggregation und Persistenz sind vermischt

Kein expliziter Ingestion-Layer

Kein formales Modell für:

Ticks

Orderbook

zukünftige Orderflow-Analysen

Strategy Engine ist implizit von Market-Data-Struktur abhängig

EVENTS (IST)

RELEVANTE ORTE:

src/server/events/

src/lib/engine/modules/eventRelevance.ts

src/lib/engine/modules/eventModifier.ts

src/lib/engine/modules/eventRingV2.ts

src/server/repositories/eventRepository.ts

FUNKTIONALE VERANTWORTUNG:

Event-Ingestion (Calendar, News)

AI-Enrichment

Event-Relevance pro Asset

Event-Risk via Ring-Logik

AKTUELLE STÄRKEN:

Sehr ausgefeilte Event-Logik

Klare Konzepte (Relevance, Modifier, Ring)

Funktional zentral für Event-Trading

PROBLEME / RISIKEN:

Event-Domänenlogik liegt im Engine-Bereich

Event-Datenbeschaffung ist servernah

Keine klare Event-Domäne mit Ports

Engine kennt Event-Details, die eigentlich Infrastruktur sind

SENTIMENT (IST)

RELEVANTE ORTE:

src/server/sentiment/

src/lib/engine/sentimentMetrics.ts

src/lib/engine/sentimentAdjustments.ts

src/lib/engine/modules/sentimentScoring.ts

FUNKTIONALE VERANTWORTUNG:

Sentiment-Scores

Flags & Confidence

Adjustments auf Setup-Scores

AKTUELLE STÄRKEN:

Gute Modellierung von Scores & Contributions

Sinnvolle Trennung innerhalb der Engine

PROBLEME / RISIKEN:

Provider, Normalisierung und Scoring nicht getrennt

Engine kennt Provider-nahe Strukturen

Erweiterung um neue Quellen teuer

STRATEGY / PERCEPTION ENGINE (IST)

RELEVANTE ORTE:

src/lib/engine/

src/features/perception/

src/app/api/perception/

src/app/api/cron/

FUNKTIONALE VERANTWORTUNG:

Build von Perception Snapshots

Scoring (Bias, Event, Sentiment, Confidence)

Playbooks, Setup-Generierung

Grades / No-Trade Entscheidungen

AKTUELLE STÄRKEN:

Sehr mächtige Engine

Klarer Scoring-Flow

Gute Erweiterbarkeit auf Logik-Ebene

PROBLEME / RISIKEN:

Engine importiert servernahe Module

asOf wird nicht überall technisch erzwungen

Determinismus nicht garantiert

Backtesting aktuell nicht möglich

BACKTESTING (IST)

RELEVANTE ORTE:

src/app/[locale]/backtesting/

STATUS:

UI vorhanden

keine Simulation

keine Execution

keine Persistenz

RISIKO:

Strategien können nicht validiert werden

Event-Impact nicht reproduzierbar

UI (IST)

RELEVANTE ORTE:

src/app/

src/components/

src/app/[locale]/admin/(panel)/

STATUS:

Funktionierende Dashboards

Gute Admin-Tools

Kein Journaling

Keine Signal-Domäne

================================================================
SOLL-ARCHITEKTUR (ZIELBILD)

ZIEL:

Eine Architektur, die:

Live-Trading

Event-Trading

Backtesting

spätere Automatisierung

mit derselben Strategy Engine ermöglicht.

ZIEL-DOMÄNEN

domain/market-data
domain/events
domain/sentiment
domain/strategy
domain/backtesting

Infrastruktur:

infrastructure/db
infrastructure/cache
infrastructure/http

KERNPRINZIPIEN

Domain-Code kennt keine Infrastruktur

Strategy Engine arbeitet nur mit Snapshots

Backtesting = gleiche Engine wie Live

Striktes TypeScript, kein any

Keine Breaking Changes ohne Migration

MERMAID – ZIELARCHITEKTUR

graph TD
MarketData --> EventService
MarketData --> SentimentService
EventService --> StrategyEngine
SentimentService --> StrategyEngine
MarketData --> StrategyEngine
StrategyEngine --> LiveSignals
StrategyEngine --> BacktestingSimulator
BacktestingSimulator --> Reports
StrategyEngine --> UI

REFACTORING-MATRIX (IST → SOLL)

MARKET DATA:

src/server/providers/* → infrastructure/http/*

src/server/marketData/* → domain/market-data/services/*

candleRepository.ts → infrastructure/db + domain/ports

EVENTS:

engine/modules/event* → domain/events/services/*

server/events/* → infrastructure/http + adapters

SENTIMENT:

engine/sentiment* → domain/sentiment/services/*

server/sentiment/* → infrastructure/http

ENGINE:

perceptionDataSource.ts → Snapshot-only, Ports

perceptionEngine.ts → Infrastruktur-frei

BACKTESTING:

app/backtesting/* → domain/backtesting + api

================================================================
ENDE DER DATEI