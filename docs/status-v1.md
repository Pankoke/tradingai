# Status-Report TradingAI – Version 1

**Stichtag:** 30. Januar 2026  
**Source of Truth:** `/docs` (architecture-v1.md, roadmap-v2.md, gaps-v1.md)

Dieses Dokument fasst den aktuellen Umsetzungsstand des TradingAI-Systems zusammen.  
Alle Aussagen zu „fertig / umgesetzt“ sind mit konkreten Fundstellen belegt.

---

## Status-Übersicht (nach Domänen)

| Bereich | Status | Evidenz |
|-------|--------|---------|
| **Market Data Ingestion** | 🟡 Teilweise umgesetzt | `architecture-v1.md → Market Data (IST)`; Derived Candles vorhanden (`source="derived"`), aber kein klarer Ingestion-Layer |
| **Event Integration** | 🟡 Funktional, architektonisch unsauber | `architecture-v1.md → Events (IST)`; Logik im Engine-Bereich |
| **Sentiment** | 🟢 V2 umgesetzt | `roadmap-v2.md → Phase 5 – Sentiment V2 (Slices 5.1–5.3 done)` |
| **Strategy / Perception Engine** | 🟡 Stark, asOf jetzt enforced | `architecture-v1.md → Strategy / Perception Engine (IST)` |
| **Backtesting / Simulation** | 🟡 MVP vorhanden (deterministisch) | `roadmap-v2.md → Phase 6 – Backtesting MVP (Slices 6.1–6.2 done)` |
| **UI (Dashboards/Admin)** | 🟢 Funktionsfähig | `architecture-v1.md → UI (IST)` |
| **Data / Storage** | 🟢 Stabil | Drizzle/Postgres, Candle & Snapshot Persistenz |
| **Observability / Health** | 🟢 Weitgehend umgesetzt | `roadmap-v2.md → Phase 4 – Events V2 / Health` |
| **Security / Auth** | 🟡 Basis vorhanden | Admin-Routen abgesichert, keine explizite Domänen-Security |

---

## Detailstatus nach Bereich

### Market Data Ingestion
**Fertig**
- Funktionierende Datenpipeline
- Provider-Fallbacks
- 1H → 4H Derived Candles

**Offen**
- Kein expliziter Ingestion-Layer
- Fetch / Normalize / Aggregate / Persist vermischt  
📍 *Evidenz:* `architecture-v1.md → Probleme/Risiken (Market Data)`

---

### Event Integration
**Fertig**
- Event-Relevance, Modifier, Ring-Logik
- Event-Ingestion (Calendar, News)
- Health-Integration

**Offen**
- Event-Domänenlogik liegt im Engine-Bereich
- Kein klarer Port-Contract  
📍 *Evidenz:* `architecture-v1.md → Events (IST)`

---

### Sentiment
**Fertig**
- SentimentSnapshotV2
- Multi-Source-Merge
- Deterministische Normalisierung
- Backfill & Health-Integration  
📍 *Evidenz:* `roadmap-v2.md → Phase 5 (alle Slices done)`

---

### Strategy / Perception Engine
**Fertig**
- Snapshot-basierte Engine
- Klare Scoring-Flows
- Playbooks & Grades
- asOf in Engine/DataSource enforced (keine Zeit-Defaults)
- EventRingV2 windowing strikt asOf-basiert (keine Echtzeit-Fallbacks)

**Offen**
- Imports aus `src/server/**`
- Guardrails/Ports weiter härten
- Guardrails/Ports weiter härten  
📍 *Evidenz:* `architecture-v1.md → Probleme/Risiken (Engine)`

---

### Backtesting / Simulation
**Fertig**
- Deterministischer Backtest-Runner
- Snapshot-basierte Inputs
- Report-Summary (KPIs)
- Execution MVP v1: OrderIntent + next-step-open Entry-Fills (kein PnL)
- Execution v2b: Trades mit PnL/Kosten + KPIs
- Persistenz/Indexing: `backtest_runs` (runKey-unique, JSONB trades/kpis, idempotent)
- Lookahead-Guard (Candle-Timestamps <= asOf in Debug)
- Playback-Mode: Backtest kann persistierte Perception-Snapshots/Items lesen (optional, Default weiter live)

**Offen**
- Keine Candle-Replay-Execution / Positions-Management verfeinert
- Keine UI/Explorer für Backtest-Runs
- Trades noch nicht normalisiert (JSONB-only)  
📍 *Evidenz:* `gaps-v1.md → G-01`

---

### UI
**Fertig**
- Dashboards
- Admin-Health
- Setup-Übersichten

**Offen**
- Kein Journaling
- Keine Signal-Domäne  
📍 *Evidenz:* `gaps-v1.md → G-06, G-07`

---

## Zentrale Risiken

- **Determinismus:** fehlendes `asOf`-Enforcement
- **Look-Ahead-Bias:** Gefahr bei Replay/Backtests
- **Datenlatenz:** Provider-Abhängigkeiten
- **Architektur-Drift:** fehlende harte Boundaries

---

## Gesamtbewertung

> **TradingAI ist funktional stark, technisch weit entwickelt und nahe an Produktionsreife –  
> die nächsten Schritte sind klar architektonisch, nicht feature-getrieben.**
- Admin: backtest_runs read-only listing API available (list & detail, trades omitted in list).

- UI: Admin backtest viewer (list + detail, equity curve) consuming backtest_runs APIs.


- UI: Admin backtest runs compare (primary + optional compare, KPIs & equity overlay).

- Backtesting: backtest_runs migration added (0004), Admin Backtests page has nav link and run button (POST /api/admin/backtest/run).
- Admin: CSV export for backtest runs (trades/kpis) via /api/admin/backtest/runs/[runKey]/export
- Backtest Run Form now accepts feeBps/slippageBps/holdSteps for parameter studies.
- Admin: Compare delta CSV export (kpis/summary/all) available via /api/admin/backtest/compare/export.
- Admin: compare delta CSV export (read-only) shipped; deterministic headers/ordering.
- Migration hygiene PR1: drizzle journal aligned with existing SQL (0000-0009) for reproducible fresh migrate.
- Migration hygiene PR2: added db:status/db:migrate/db:reset scripts + db-migrations-v1 guide.
- Admin backtests UX: filters/sort/limit, clone-to-form, mini analytics, CSV exports, compare, info-block; Run-Form jetzt mit Datumspicker (UTC start/end) statt ISO-Text.
- Admin Backtests: info-block + date picker (UTC), filters/sort/clone/export remain.
- Admin: Backtest Run-Form erlaubt Snapshot-Quelle (live vs playback), Default bleibt live.
