ROADMAP V2 – UMSETZUNG DER ARCHITEKTUR

================================================================

ZIEL
Diese Roadmap beschreibt die konkrete Umsetzung der in v1 definierten Architektur.

================================================================
PHASE 0 – STEUERUNG & BASIS

Ziel:

Architektur als Single Source of Truth etablieren

Ergebnis:

architecture-v1.md

decisions-v1.md

gaps-v1.md

roadmap-v2.md

Agentenmodus:

Analyse

Repo-Scan

Architektur-Validierung

================================================================
PHASE 1 – PORTS & COMPOSITION ROOT

Ziel:

Einführung von Ports (Interfaces)

Keine funktionalen Änderungen

Ergebnis:

domain/*/ports.ts

infrastructure/* Adapter

zentraler Container

Agentenmodus:

Import-Graph

Port-Design

Refactor-Vorschläge

Status 2026-01-29:
- Ports + Types für market-data, events, sentiment, strategy erstellt
- Adapter + Composition Root (src/server/container.ts) angelegt, Smoke-Test hinzugefügt

================================================================
PHASE 1.5 – ARCHITEKTUR-GUARDRAILS

Ziel:

Domain vom Server trennen, Architektur-Drift verhindern

Ergebnis:

ESLint-Guardrail: src/domain/** darf nicht aus src/server/** importieren (Fehler, „Domain ≠ Server“)
ESLint-Warnung: src/lib/engine/** soll keine src/server/** Imports nutzen (Warn-Level, Vorbereitung Entkopplung)

Status 2026-01-29:
- Guardrails aktiviert (eslint.config.mjs, no-restricted-imports)

================================================================
PHASE 2 – ENGINE ENTKOPPLEN

Ziel:

Entfernung aller servernahen Imports aus Engine

asOf erzwingen

Ergebnis:

deterministische Engine

Backtesting-fähig

Agentenmodus:

Sehr stark (Refactor-Hilfe)

Slice 2.1 (2026-01-29):
- perceptionDataSource entkoppelt von server-imports (Ports + Container-Fabrik)
- asOf wird an DataSource-Boundary geführt (deterministisch)
- Container-Fabrik verfügbar für Live-Betrieb, Mock bleibt erhalten

Slice 2.2 (2026-01-29):
- perceptionEngine serverfrei (keine direkten server-imports)
- Snapshot-only Contract: Engine orchestriert, DataSource liefert Daten via Ports/Factory
- asOf als first-class Parameter bis in Engine/DataSource durchgereicht

Slice 2.3a (2026-01-29):
- Event-Module serverfrei (eventRingV2 entkoppelt, Ports/Inputs statt DB)
- Event-Windows deterministisch über asOf/Window-Params
- Tests für Event-Flow mit Ports-basierten Inputs hinzugefügt

Slice 2.3b (2026-01-29):
- Market/Candle Pfad serverfrei (marketMetrics/orderflowMetrics arbeiten auf injizierten Candles)
- asOf end-to-end im Market Snapshot, Candle-Ranges bounded (from/to)
- Pure-Test für marketMetrics mit fixem asOf hinzugefügt
- orderflowMetrics serverfrei & deterministisch (Ports-Eingaben, bounded windows), Pure-Test ergänzt

================================================================
PHASE 3 – MARKET DATA V2

Ziel:

Saubere Ingestion

Normalisierung

Aggregation

================================================================
PHASE 4 – EVENTS V2

Ziel:

Event-Domäne

Relevance, Modifier, Ring als Services

================================================================
PHASE 5 – SENTIMENT V2

Ziel:

Austauschbare Sentiment-Quellen

Normierte Snapshots

================================================================
PHASE 6 – BACKTESTING MVP

Ziel:

Candle-Replay

Order-Execution

Persistente Ergebnisse

================================================================
PHASE 7 – UI: SIGNALS & JOURNALING

Optional nach MVP

================================================================
ARBEITSWEISE

Agentenmodus:

Analyse

Planung

Refactor-Vorschläge

Normaler Modus:

Codex-Prompts

Konkrete Implementierung

================================================================
ENDE DER DATEI
