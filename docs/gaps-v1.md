GAPS / LÜCKENANALYSE – VERSION 1
TRADINGAI – ARCHITEKTUR & PRODUKT

================================================================
ZWECK

Dieses Dokument listet die identifizierten Lücken (Gaps) zwischen der IST-Architektur
und dem definierten SOLL-Zielbild.

Für jede Lücke werden festgehalten:

Beschreibung

Priorität

Abhängigkeiten

Risiken

Definition of Done (DoD)

Wie die Erfüllung geprüft wird

Dieses Dokument dient als Problem-Backlog, nicht als Roadmap
(diese ist in roadmap-v2.md).

================================================================
G-01 – FEHLENDER BACKTESTING-SIMULATOR

PRIORITÄT: SEHR HOCH
DOMÄNE: Backtesting / Strategy

BESCHREIBUNG
Aktuell existiert nur eine Backtesting-UI ohne funktionale Simulation.
Es gibt:

kein Candle-Replay

keine Order-Execution

keine PnL-Berechnung

keine Persistenz von Backtest-Runs

AUSWIRKUNG

Strategien können nicht validiert werden

Event-Impact ist nicht reproduzierbar

Vertrauen in Scores/Setups leidet

ABHÄNGIGKEITEN

G-02 (Engine-Entkopplung)

G-03 (Market-Data Ingestion klar definiert)

RISIKEN

Komplexität der Execution (Slippage/Fees)

Gefahr von Look-Ahead Bias bei falschem Replay

DEFINITION OF DONE

Candle-Replay auf Basis historischer Daten

Execution (MVP: Market Orders)

Persistente BacktestRuns + Trades

Nutzung derselben Strategy Engine wie Live

PRÜFUNG

Gleiche Inputs → gleiche Outputs

Vergleich Live vs Backtest bei identischem Zeitraum

================================================================
G-02 – STRATEGY ENGINE NICHT SAUBER ENTKOPPELT

PRIORITÄT: SEHR HOCH
DOMÄNE: Strategy / Engine

BESCHREIBUNG
Die Strategy/Perception Engine importiert servernahe Module
(Repositories, Provider, DB-Typen).

AUSWIRKUNG

Schwer testbar

Determinismus/asOf weitgehend enforced (Zeit-Defaults entfernt)

Backtesting kaum möglich

ABHÄNGIGKEITEN

Keine (Grundlagenproblem)

RISIKEN

Refactor kann viele Dateien betreffen

Gefahr unbeabsichtigter Breaking Changes

DEFINITION OF DONE

Keine Imports aus src/server/* in domain/strategy

Engine arbeitet nur mit:

Snapshots

Ports (Interfaces)

asOf wird technisch erzwungen

PRÜFUNG

Engine kann in Isolation mit Mock-Snapshots laufen

Deterministische Wiederholung identischer Runs

================================================================
G-03 – KEIN KLARER MARKET-DATA INGESTION-LAYER

PRIORITÄT: HOCH
DOMÄNE: Market Data

BESCHREIBUNG
Fetch, Normalisierung, Aggregation und Persistenz sind vermischt.
Kein explizites Modell für:

Ticks

Orderbook

Derived Timeframes als First-Class Citizens

AUSWIRKUNG

Erweiterungen (Intraday/Orderflow) teuer

Hohe Kopplung zwischen Engine und Datenform

ABHÄNGIGKEITEN

G-02 (Ports/Engine-Boundary)

RISIKEN

Provider-Edgecases

Performance bei Re-Aggregation

DEFINITION OF DONE

domain/market-data mit:

Provider-Ports

Normalisierungs-Services

Aggregation (z. B. 1H → 4H)

Engine konsumiert MarketSnapshot

PRÜFUNG

Neue Provider ohne Engine-Änderung integrierbar

Derived Candles klar als solche markiert

================================================================
G-04 – EVENT-DOMÄNE NICHT SAUBER ABGETRENNT

PRIORITÄT: HOCH
DOMÄNE: Events

BESCHREIBUNG
Event-Relevance, Modifier und Ring liegen im Engine-Bereich,
während Event-Ingestion servernah erfolgt.

AUSWIRKUNG

Unklare Verantwortlichkeiten

Schwierige Erweiterung um neue Event-Quellen

ABHÄNGIGKEITEN

G-02 (Engine-Entkopplung)

G-03 (Snapshots als Input)

RISIKEN

Event-Timing/Windows müssen korrekt modelliert bleiben

DEFINITION OF DONE

domain/events mit:

Adaptern

Services (Relevance, Modifier, Ring)

Einheitlicher EventSnapshot für Engine

PRÜFUNG

Neue Event-Quelle ohne Engine-Änderung

Event-Scores reproduzierbar (asOf)

================================================================
G-05 – SENTIMENT-DOMÄNE NICHT KONSEQUENT GETRENNT

PRIORITÄT: MITTEL
DOMÄNE: Sentiment

BESCHREIBUNG
Sentiment-Provider, Normalisierung und Scoring sind nicht strikt getrennt.

AUSWIRKUNG

Erschwerte Erweiterung

Engine kennt zu viele Details

ABHÄNGIGKEITEN

G-02 (Engine-Boundary)

RISIKEN

Unterschiedliche Quellen mit inkompatiblen Skalen

DEFINITION OF DONE

domain/sentiment mit:

Provider-Adaptern

Normalisierung

SentimentSnapshot

PRÜFUNG

Austausch einer Quelle ohne Engine-Änderung

================================================================
G-06 – KEIN JOURNALING (TRADING REVIEW)

PRIORITÄT: MITTEL
DOMÄNE: UI / Produkt

BESCHREIBUNG
Es gibt keine Möglichkeit für Nutzer:

Trades zu dokumentieren

Notizen zu speichern

Reviews durchzuführen

AUSWIRKUNG

Geringerer Nutzer-Mehrwert

Keine Lern-/Feedback-Schleife

ABHÄNGIGKEITEN

Keine (rein produktseitig)

DEFINITION OF DONE

Journaling-UI

DB-Schema für Trades/Notes

Verknüpfung mit Setups/Signals

PRÜFUNG

Trade kann erstellt, bearbeitet, ausgewertet werden

================================================================
G-07 – KEINE SIGNAL-DOMÄNE

PRIORITÄT: MITTEL
DOMÄNE: UI / Signals

BESCHREIBUNG
Kein zentrales Signal-Konzept (Alerts, Watchlists, Delivery).

AUSWIRKUNG

Passive Nutzung

Geringe Nutzerbindung

ABHÄNGIGKEITEN

G-02 (Engine Outputs klar definiert)

DEFINITION OF DONE

Signal-Model

Delivery-Mechanismus (Webhook/Push optional)

UI-Integration

PRÜFUNG

Signal wird erzeugt, ausgeliefert, quittiert

================================================================
G-08 – UI NICHT DOMÄNENORIENTIERT STRUKTURIERT

PRIORITÄT: NIEDRIG
DOMÄNE: UI

BESCHREIBUNG
UI-Struktur folgt aktuell technischen statt domänenspezifischen Grenzen.

AUSWIRKUNG

Wartbarkeit sinkt mit Wachstum

DEFINITION OF DONE

UI nach Dashboards / Signals / Journaling gegliedert

================================================================
G-09 – FEHLENDE ARCHITEKTUR-GUARDRAILS

PRIORITÄT: NIEDRIG
DOMÄNE: Projektorganisation

BESCHREIBUNG
Keine automatischen Schutzmechanismen gegen Architektur-Drift.

AUSWIRKUNG

Langfristige Erosion der Zielarchitektur

DEFINITION OF DONE

Lint/Path-Regeln

Doku zu “allowed imports”

Review-Checkliste

================================================================
ENDE DER DATEI

Note: G-01 narrowed – Backtest Execution entries implemented; PnL/Exit remain open.
Note 2026-02-03: Backtest Reports nicht mehr nur auf Disk � Runs werden zus�tzlich in backtest_runs (runKey unique, JSONB trades/kpis) persistiert; verbleibend: Trades normalisieren & UI.

- Gap G-Backtests: Runs now queryable via admin API; UI/persistence normalization remains future work.


- Gap note: Backtest reports now viewable via admin page; remaining gap is UI for compare/export/normalized trades.


- Gap note: Operators can now compare backtest runs via admin UI; remaining gap is export/normalized trade analytics.

- Gap resolved: backtest_runs table missing was fixed via migration 0004; nav entry and run starter present.
- Tooling gap mitigated: Backtest CSV export available (trades/kpis).
- Gap update: Operators can vary fee/slippage/holdSteps when starting backtests.
- Gap note: compare delta CSV export available; remaining gap is normalized trade analytics/CSV per bucket.
- Gap: drizzle journal drift mitigated (journal synced with migrations); remaining DX: reset/migrate scripts.
- Gap closed: reproducible migrations now documented with scripts (status/migrate/reset).
- Gap mitigated: operator UX improved for backtests (filters/sort/clone/export), remaining: normalized trade analytics.
- Operator UX gap further mitigated: Backtests page now has date picker instead of ISO text (UTC interpreted).
