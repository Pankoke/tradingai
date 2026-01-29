ARCHITECTURE DECISION RECORDS (ADR) – VERSION 1
TRADINGAI – ENTSCHEIDUNGSLOG (REFERENZ)

================================================================
ZWECK

Dieses Dokument hält die zentralen Architekturentscheidungen fest, die aus der IST-Analyse
abgeleitet wurden und das SOLL-Zielbild begründen.

Jede ADR enthält:

Kontext / Problemstellung

Entscheidung

Alternativen

Konsequenzen / Tradeoffs

Status

Umsetzungshinweise (ohne Roadmap-Charakter)

================================================================
ADR-001 – DOMAIN-BASIERTE PROJEKTSTRUKTUR (DDD-LIGHT)

KONTEXT
Die aktuelle Struktur mischt:

Infrastruktur (DB/Redis/HTTP/Provider)

Domain-Logik (Engine Scoring, Rings, Playbooks)

UI (Next App Router)

Das führt zu:

unklaren Verantwortlichkeiten

schwer testbarer Engine

schwer reproduzierbaren Runs (Backtesting/Determinismus)

ENTSCHEIDUNG
Einführung einer domain-basierten Struktur unter src/domain/* mit folgenden Domänen:

domain/market-data

domain/events

domain/sentiment

domain/strategy

domain/backtesting

Infrastruktur wird gebündelt unter src/infrastructure/*:

infrastructure/db (Drizzle Repos, Schema Integration)

infrastructure/cache (Redis)

infrastructure/http (Provider Fetching, Retry, Rate Limits)

optional: infrastructure/auth (Clerk, Admin/Cron policies)

ALTERNATIVEN
A) “Clean Architecture” strikt in Layers (entities/usecases/interfaces/frameworks)

sehr sauber

hoher Umbauaufwand, Risiko für Breaking Changes

B) “Feature-based” Struktur (features/* je Use Case)

passt gut zu Next

Domain-Querschnitt (Market Data / Events / Sentiment) wird unklar

C) Monolith beibehalten, nur Dokumentation verbessern

geringster Aufwand

löst Kopplungsprobleme nicht, Backtesting bleibt schwer

WARUM DIESE ENTSCHEIDUNG
DDD-light erlaubt:

schrittweise Migration ohne Breaking Changes

klare Ownership pro Domäne

Ports/Interfaces als Boundary

KONSEQUENZEN / TRADEOFFS

deutlich bessere Strukturierbarkeit und Testbarkeit

erleichtert Backtesting

mehr Dateien/Boilerplate (ports/types/adapters)

initialer Refactor-Aufwand

STATUS
Beschlossen (v1)

UMSETZUNGSHINWEIS
Zuerst Ports/Interfaces einführen, Implementierungen bleiben zunächst bestehen
(“Adapter um bestehende Repos/Provider”).

================================================================
ADR-002 – STRATEGY ENGINE IST INFRASTRUKTUR-AGNOSTISCH

KONTEXT
Die Strategy/Perception Engine importiert aktuell (direkt oder indirekt) Infrastruktur:

Repositories

Provider

DB-nahe Modelle

Das macht:

Unit Tests schwer

deterministische Runs schwierig

Backtesting praktisch unmöglich ohne Replikation von Infrastruktur

ENTSCHEIDUNG
Die Strategy Engine (domain/strategy) darf:

keine DB/Redis/HTTP Imports besitzen

nur Ports (Interfaces) und Snapshots konsumieren

Abhängigkeiten werden per Dependency Injection übergeben (Container/Composition Root).

ALTERNATIVEN
A) Engine behält DB/Provider Zugriff, Backtesting wird getrennt gebaut

führt zu Drift zwischen Live und Backtest

B) Engine “semi-clean”: DB-Zugriff erlaubt, Provider nicht

Boundary bleibt unscharf

WARUM DIESE ENTSCHEIDUNG

Backtesting und Live müssen identische Logik verwenden

Determinismus braucht klare Inputs (Snapshots, asOf)

KONSEQUENZEN / TRADEOFFS

Engine wird testbar und deterministisch

Backtesting kann dieselbe Engine nutzen

initial mehr DI/Ports nötig

Umbau von Imports erforderlich

STATUS
Beschlossen (v1)

UMSETZUNGSHINWEIS
Als erstes: perceptionDataSource so refactoren, dass sie Snapshots baut,
aber die Engine selbst nur Inputs bekommt.

================================================================
ADR-003 – SNAPSHOT-ONLY INPUTS (MARKET/EVENT/SENTIMENT)

KONTEXT
Heute werden Daten häufig “on the fly” geholt oder normalisiert.
Unterschiedliche Komponenten haben unterschiedliche Sicht auf den Datenstand.

ENTSCHEIDUNG
Alle externen Domänen liefern normierte Snapshots:

MarketSnapshot (Klines/Candles, optional Ticks/Orderbook)

EventSnapshot (High-impact Events + Scores + Windows)

SentimentSnapshot (Score + Confidence + Flags + Contributions)

Die Engine konsumiert nur diese Snapshots.

ALTERNATIVEN
A) Engine ruft Provider selbst auf

führt zu nicht-deterministischen Runs und schwerem Testing

B) Engine erhält rohe Daten (Raw) und normalisiert intern

verschiebt die Komplexität in die Engine und koppelt sie an Quellen

WARUM DIESE ENTSCHEIDUNG
Snapshots sind:

deterministisch

cachebar

versionierbar

ideal für Backtesting und Audit

KONSEQUENZEN / TRADEOFFS

klare Inputs, klare Debugbarkeit

bessere Monitoring/Health Möglichkeiten

Snapshot-Definitionen müssen gepflegt werden

kann initial “mehr Arbeit” wirken, zahlt sich aber aus

STATUS
Beschlossen (v1)

UMSETZUNGSHINWEIS
Snapshot-Types zunächst als Wrapper um bestehende Typen bauen, später bereinigen.

================================================================
ADR-004 – BACKTESTING NUTZT DIESELBE ENGINE WIE LIVE

KONTEXT
Backtesting existiert im UI, aber ohne Simulator.
Das Risiko ist groß, zwei Logikpfade zu entwickeln:

Live Engine

Backtest Engine

ENTSCHEIDUNG
Backtesting ruft dieselbe Strategy Engine auf.
Unterschied ist nur die Datenquelle:

Live: Snapshots von aktuellen Daten

Backtest: Snapshots aus Replay (historische Daten)

ALTERNATIVEN
A) Separate Backtest-Engine

führt zu Drift, schlechte Vergleichbarkeit

B) Backtesting als “Replay UI” ohne echte Execution

liefert keine PnL/Execution Validierung

WARUM DIESE ENTSCHEIDUNG

Nur identische Logik liefert echte Validität

Look-Ahead Bias wird minimiert

KONSEQUENZEN / TRADEOFFS

hohe Aussagekraft

konsistentes Debugging

Simulator muss sauber modelliert werden (Fees/Slippage/Execution)

STATUS
Beschlossen (v1)

UMSETZUNGSHINWEIS
Backtesting MVP: Candle-Replay + einfache Market-Order Execution + Metriken.

================================================================
ADR-005 – STRICT TYPESCRIPT: KEIN any, GUARDS/STABLE TYPES

KONTEXT
Das Repo nutzt strict TS und ESLint no-explicit-any.
Provider Payloads und dynamische JSON-Strukturen bergen Risiken.

ENTSCHEIDUNG

kein any

Verwendung von:

expliziten Typen

Type Guards

optional: Zod-Schemas für externe Payloads (HTTP responses)

ALTERNATIVEN
A) any für “schnelleres” Shipping

langfristig instabil, Refactor-Risiko hoch

B) nur unknown ohne Guards

Laufzeitfehler verlagern sich in Business-Logik

WARUM DIESE ENTSCHEIDUNG
Trading-Logik braucht deterministische, auditierbare und stabile Daten.

KONSEQUENZEN / TRADEOFFS

deutlich stabilere Codebasis

weniger Runtime Bugs

mehr initialer Typ-Aufwand

STATUS
Beschlossen (v1)

UMSETZUNGSHINWEIS
Externe Provider Responses immer als unknown behandeln und validieren.

================================================================
ADR-006 – “NO BREAKING CHANGES” MIGRATIONSPOLICY

KONTEXT
Bestehende UI/APIs/Cron-Flows müssen stabil bleiben.

ENTSCHEIDUNG
Migration erfolgt in Etappen:

Ports einführen

Adapter um bestehende Implementierungen legen

Nutzung intern schrittweise umstellen

Alte Imports erst entfernen, wenn Coverage/Tests vorhanden

ALTERNATIVEN
A) Big Bang Rewrite

zu riskant

STATUS
Beschlossen (v1)

================================================================
ENDE DER DATEI