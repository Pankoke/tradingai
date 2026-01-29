Phase 2 Analysis – Engine Entkopplung
1 Dependency‑Map der Engine‑ und Perception‑Module

Die folgenden Module in src/lib/engine, src/features/perception und src/domain importieren direkt oder indirekt Komponenten aus src/server/…. Jede Abhängigkeit ist in eine Kategorie eingeordnet: Repository (Zugriff auf die DB), Provider (externer Datenlieferant), DB‑Typ (Typen/Enums aus dem DB‑Schema) oder Utility (sonstige serverseitige Helfer).

Engine/Perception‑Datei	Importiertes server‑Modul	Kategorie	Begründung
perceptionDataSource.ts	src/server/repositories/assetRepository	Repository	liefert aktive Assets.
	src/server/repositories/eventRepository	Repository	liefert Events in Zeitfenstern; z.B. getEventsInRange wird in getEventsForWindow verwendet.
	src/server/providers/biasProvider	Provider	liefert Bias‑Snapshots (Marktstimmung) via DbBiasProvider.getBiasSnapshot.
	src/server/repositories/candleRepository	Repository	liest Candles (getLatestCandleForAsset) und persistiert Updates in ensureLatestCandle.
	src/server/providers/marketDataProvider	Provider	definiert Timeframe & Provider‑Funktionen für Candle‑Fetch.
	src/server/marketData/MarketDataProvider	Provider	enthält spezifische Providerimplementierungen.
	src/server/marketData/timeframeConfig	DB‑Typen / Utility	enthält TIMEFRAME_SYNC_WINDOWS und Funktionen zur Bestimmung gültiger Zeitfenster.
	src/server/marketData/providerResolver	Utility	wählt den passenden Market‑Data‑Provider.
	src/server/sentiment/providerResolver	Utility	wählt den passenden Sentiment‑Provider; anschließend wird provider.fetchSentiment aufgerufen.
	src/server/sentiment/SentimentProvider	Provider	Typen / Kontexte für Sentiment‑Snapshots.
	src/server/marketData/providerDisplay	Utility	Mapping von provider‑Symbolen zu Anzeige‑Namen.
perceptionEngine.ts	src/server/repositories/eventRepository	Repository	nutzt getEventsInRange für die Score‑Berechnung.
buildSetups.ts (features/perception)	Importiert diverse Engine‑Module, aber keine server‑Abhängigkeiten; ruft jedoch indirekt perceptionDataSource (somit transitiv).	—	—
snapshotStore.ts (features/perception)	src/server/db/schema/…	DB‑Typ	nutzt DB‑Typen für Snapshots (Persistenz).
generateExplanation.ts (features/perception)	src/server/repositories/eventRepository, biasProvider	Repository/Provider	erzeugt Texte auf Basis von Event‑ und Bias‑Daten.
eventRelevance.ts, eventModifier.ts, eventRingV2.ts	Keine direkten server‑Abhängigkeiten, aber Teil des Engines (Scores).	—	—
sentimentMetrics.ts, sentimentScoring.ts	Importieren Raw‑Sentiment‑Typen aus src/server/sentiment/SentimentProvider.	Provider	Abhängig von Provider‑Types.
marketMetrics.ts, orderflowMetrics.ts	Importieren DB‑Typen aus src/server/db/schema/candles.	DB‑Typ	für Candle‑Aggregation.
biasScoring.ts	nutzt DbBiasProvider.getBiasSnapshot (Provider).	Provider	Kalkulation des Bias‑Scores.
src/domain	bislang wenig Code (Ports wurden in Phase 1 eingeführt).	—	—

Fazit: Das Modul perceptionDataSource.ts ist der größte Hotspot: es importiert zahlreiche Repositories und Provider. Andere Engine‑Module wie perceptionEngine.ts oder sentimentMetrics.ts haben vereinzelte server‑Imports, die aber im Vergleich weniger kritisch sind.

2 Hotspot‑Analyse (Top 10)

perceptionDataSource.ts – sehr kritisch (9 server‑Imports). Enthält Logik zum Laden von Assets, Events, Bias, Sentiment und Market‑Data. Hier muss die Engine entkoppelt werden; Ports aus Phase 1 bieten bereits Interfaces für Repositories/Provider.

perceptionEngine.ts – ruft getEventsInRange und orchestriert das Scoring. Kritisch, da alle Scores hier zusammenlaufen.

snapshotStore.ts – persistiert Perception‑Snapshots direkt via DB‑Schema; muss auf Ports umgestellt werden, um Snapshots über die Engine zu laden/speichern.

generateExplanation.ts – mischt Domain‑Textausgabe mit Repository‑Zugriffen (Events/Bias), sollte Ports nutzen.

marketMetrics.ts / orderflowMetrics.ts – nutzen DB‑Typen für Candle‑Aggregation; diese Typen sollten in die Domain verschoben und über Ports bereitgestellt werden.

sentimentMetrics.ts / sentimentScoring.ts – Abhängigkeiten zu SentimentProvider beschränken Erweiterbarkeit; sollten Ports verwenden und Snapshots konsumieren.

biasScoring.ts / biasMetrics.ts – verwendet DbBiasProvider; ebenfalls auf Ports umstellen.

eventRelevance.ts / eventModifier.ts / eventRingV2.ts – aktuell keine direkten server‑Imports, aber werden von perceptionEngine orchestriert; entkoppelte Engine braucht klare Inputs statt direkten Event‑Lookups.

buildSetups.ts – orchestriert Setups; ruft derzeit Engine‑Funktionen, aber sollte nur Domain‑Services nutzen.

any remaining utility functions in src/features/perception – verarbeiten oder persistieren Ergebnisse, sollten Ports nutzen.

3 Refactor‑Slices (Phase‑2‑Umsetzungsplan)

Phase 2 wird in kleine, risikoarme Slices (PRs) aufgeteilt. Jeder Slice ersetzt einzelne server‑Imports durch Ports und führt asOf deterministisch ein.

Slice	Betroffene Dateien	Ziel der Entkopplung	Verwendete Ports (Phase 1)	Risiko
2‑1 – Market‑Data Snapshot	perceptionDataSource.ts	Entferne direkte candleRepository‑ und marketDataProvider‑Imports. Nutze den Port CandleRepositoryPort für getLatestCandleForAsset und MarketDataProviderPort für Candle‑Fetch.	CandleRepositoryPort, MarketDataProviderPort	Medium – betrifft wichtige Sync‑Logik. Tests für Candle‑Fetch erforderlich.
2‑2 – Event‑Repository Port	perceptionDataSource.ts, perceptionEngine.ts, generateExplanation.ts	Ersetze getEventsInRange‑Imports durch EventRepositoryPort.	EventRepositoryPort	Medium – Änderungen an mehreren Dateien; muss durch Snapshot‑Kontext gesteuert werden.
2‑3 – Bias / Sentiment	perceptionDataSource.ts, biasScoring.ts, generateExplanation.ts	Ersetze DbBiasProvider.getBiasSnapshot und Sentiment‑Provider‑Resolvers durch BiasProviderPort (falls definiert) und SentimentProviderPort.	BiasProviderPort, SentimentProviderPort	Low – reine Austauschlogik.
2‑4 – Snapshot‑Persistenz	snapshotStore.ts, perceptionDataSource.ts	Leg die Persistenz von Snapshots hinter einen SnapshotStorePort und verwende ihn in Engine/Features.	SnapshotStorePort	Medium – erfordert DB‑Anpassung; Migration der Tabelle / Schreibpfade.
2‑5 – Market‑Data Config/Resolver	perceptionDataSource.ts	Verschiebe timeframeConfig, providerResolver, providerDisplay aus server in domain; Ports definieren, Implementation in Infrastructure.	MarketDataConfigPort (neu), ProviderResolverPort	Low – meist reine Datei‑Verschiebung, kaum Logik.
2‑6 – Features/Perception	generateExplanation.ts, buildSetups.ts, snapshotStore.ts	Ersetze alle direkten Repository/Provider‑Imports durch Ports. Nutze Snapshots als Input.	alle relevanten Ports	Medium – erfordert Koordination zwischen UI/Domain.
2‑7 – Metrics/Scoring	marketMetrics.ts, orderflowMetrics.ts, sentimentMetrics.ts, sentimentScoring.ts, biasScoring.ts	Definiere Domain‑Types und Ports für Bias/Sentiment/Market‑Metrics; entkopple DB‑Typen.	MarketMetricsPort (neu), SentimentMetricsPort (neu)	High – tiefe Eingriffe in Score‑Berechnung.
2‑8 – Engine Composition	perceptionEngine.ts, perceptionDataSource.ts	Führe einen Engine‑Factory ein, die alle Ports injiziert (Dependency Injection).	alle Ports	High – erfordert einheitliche Composition‑Root, Integrationstests.

Die Slices können parallel von unterschiedlichen Entwicklern bearbeitet werden, sofern sie jeweils auf der neuesten Basis aufbauen. Slice 2‑7 und 2‑8 sollten erst begonnen werden, wenn 2‑1 bis 2‑4 stabil sind, da sie auf den neuen Ports aufbauen.

4 asOf / Determinismus‑Check

Die Engine arbeitet im Live‑Modus mit aktuellen Zeitpunkten (Date.now()) und in Tests mit festen Referenzdaten. Das führt zu deterministischer Drift zwischen Live und Backtest. Beobachtete Stellen:

In LivePerceptionDataSource.getEventsForWindow wird das aktuelle Datum ermittelt und an getEventsInRange übergeben. Die Funktion verwendet new Date() intern.

In getBiasSnapshotForAssets und getLatestCandleForAsset wird Date.now() oder new Date() genutzt, um Zeitfenster festzulegen und zu bestimmen, ob ein Candle stale ist.

Ähnliche Muster existieren in sentimentMetrics.ts und marketMetrics.ts, wo Zeitpunkte für Score‑Berechnung generiert werden.

In perceptionEngine.ts wird now ebenfalls als Parameter ermittelt, statt von außen injiziert.

Empfehlungen:

Engine‑weit asOf erzwingen – Alle Engine‑Funktionen (Snapshots, Scoring) müssen einen asOf: Date‑Parameter akzeptieren. Dieser Parameter wird von außen (Cron‑Job, UI‑Aufruf, Backtest) übergeben und nicht intern generiert.

Ports asOf entgegennehmen – Repository/Provider‑Ports müssen asOf als Parameter unterstützen (z.B. findLatestByAsset(assetId, timeframe, asOf)), damit DB‑Queries deterministisch werden.

Fallbacks minimieren – Logik wie if (allowSync) { syncDailyCandlesForAsset } sollte asOf berücksichtigen, d.h. ggf. nur bis asOf synchronisieren, um Look‑Ahead‑Bias zu vermeiden.

Tests – Unit‑Tests müssen asOf explizit setzen und prüfen, dass bei gleicher asOf identische Snapshots und Scores erzeugt werden.

5 Ergebnisformat

Die obige Analyse kann als Markdown‑Datei docs/phase2-analysis.md eingecheckt werden. Sie enthält eine tabellarische Übersicht der Abhängigkeiten, eine Hotspot‑Analyse, den Phase‑2‑Refactor‑Plan und konkrete Empfehlungen für asOf‑Durchreichung.