# Swing Setup Pipeline Audit (Stand: 2026-02-05)

## 1) Einstiegspunkte / Trigger
- **Cron Backfill Swing**: `app/api/cron/snapshots/backfillSwing/route.ts` ruft `buildPerceptionSnapshotWithContainer({ allowSync: false, profiles: ["SWING"], assetFilter? })` → baut Swing-Snapshots on-demand ohne Sync.  
  Fundstelle: Zeile ~90, Übergabe von `profiles`/`assetFilter` an Factory.
- **Perception Today (UI/Admin)**: `app/api/perception/today/route.ts` ruftet `buildPerceptionSnapshotWithContainer({ allowSync: false })` (Standardprofile SWING/INTRADAY/POSITION) → liefert aktuellen Snapshot.  
  Fundstelle: Route-Handler, Aufruf an Factory mit `allowSync:false`.
- **Perception Cron Intraday**: `app/api/cron/perception/intraday/route.ts` nutzt ebenfalls Snapshot-Build, primär für Intraday; Swing kann per `profiles`-Param ausgeschlossen/inkludiert werden (Standard enthält SWING).  
  Fundstelle: Handler-Options an `buildPerceptionSnapshotWithContainer`.
- **Backtests**: `src/server/backtest/runBacktest.ts` erstellt Datasource via `createPerceptionDataSource` und ruft `buildPerceptionSnapshot` innerhalb des Backtest-Loops (profilgesteuert über Params).  
  Fundstelle: Zeile ~425 (buildPerceptionSnapshot with assetFilter).
- **Factory**: `src/server/perception/perceptionEngineFactory.ts` kapselt Container-Aufbau und injiziert Timeframe-Guardrails.  
  Fundstelle: Export `buildPerceptionSnapshotWithContainer`.

## 2) Datenfluss / Quellen (Swing)
- **Timeframes**: 
  - Core: 1D/1W (autoritative). Refinement: 4H optional.  
    Quelle: `src/server/marketData/timeframeConfig.ts` (`getSwingCoreTimeframes`, `getSwingRefinementTimeframes`, `getAllowedTimeframesForProfile`).  
  - Datasource erzwingt Guard: `src/lib/engine/perceptionDataSource.ts` → `assertSwingTimeframes` blockt 15m/1H/4H im Core; 4H nur als Refinement.  
- **Candles**: geladen via `perceptionDataSource.loadCandlesForTimeframes` nur für erlaubte Frames; Sync-Fenster `TIMEFRAME_SYNC_WINDOWS`.  
- **Bias**: `deps.biasProvider.getBiasSnapshot` (DB) je Asset/Timeframe (Core TF).  
- **Events**: `deps.events.findRelevant` → `resolveEventRingForSetup` + `buildEventModifier` (Event gating).  
- **Sentiment**: `deps.sentiment.fetchSentiment` → `buildSentimentMetrics`.  
- **Orderflow**: `buildOrderflowMetrics` (Swing neutralisiert missing/stale intraday; Konflikte soft).  
- **Market Metrics**: `buildMarketMetrics` (Swing nutzt nur 1D/1W; 4H/1H/15m ignoriert).  

## 3) Engine-Pipeline
- **Setup-Templates**: aus `features/perception/build/buildSetups.ts` (Templates + directions) in Kombination mit Assets/Profiles aus Datasource.  
- **Rings/Scoring**: `perceptionEngine.ts` → `buildMarketMetrics` (trend/vol/priceDrift), `buildOrderflowMetrics`, `buildSentimentMetrics`; Ring-Meta in `resolveSetupRingMeta`.  
- **SignalQuality/Confidence**: `signalQuality.ts`, `confidence.ts` (profile-aware; Swing-spezifische Schwellen).  
- **Levels/RRR**: `computeLevelsForSetup` in `src/lib/engine/levels.ts`; Swing kann optional 4H-Refinement für Bandbreite (±20% Clamp, nur Levels) nutzen; Debug enthält `refinementUsed`, `refinementEffect`.  
- **EventModifier**: `src/lib/engine/modules/eventModifier.ts` in `perceptionEngine.ts` nach Event-Ring-Auflösung; klassifiziert/ blockt nach Event-Fenster (Swing 24h).  

## 4) Playbooks & Resolver
- **Resolver**: `src/lib/engine/playbooks/index.ts` (`getPlaybookForAsset`), prüft Asset-Klassen/Symbole; Swing-Fallback `genericSwingPlaybook`.  
- **Swing-Playbooks (Auszug, alle in `index.ts`)**: Gold, Index, SPX, DAX, NDX, DOW, BTC, Crypto, FX (EURUSD/GBPUSD/USDJPY/EURJPY), Metals, Energy, Generic.  
- **Fallback/Guards**: 
  - Nicht-Swing-Patterns (`nonSwingPatterns`) → generic Swing.  
  - Spezielle Fallbacks für WTI/Silver: see tests `playbookPersistenceWtiSilver.test.ts`.  
  - Coverage: `playbook-coverage-report.md` beschreibt Soll-Zuordnung je Asset/TF/Label.  

## 5) Decision & Persistenz
- **Decision-Logik**: `features/perception/build/buildSetups.ts` → `deriveSetupDecision` + Playbook-Evaluation (Grade → Decision).  
- **Persistenz**: Snapshots via `snapshotBuildService.ts` → writes to snapshot store (DB). Fields: `decision`, `decisionReasons`, `decisionVersion`, `setupId`, Rings, Levels, Orderflow meta.  
- **SoT**: Decision wird einmalig beim Snapshot-Build festgelegt (`decision-single-source.md`); UI/Reports lesen persistierte Felder.  

## 6) Clean Swing Coverage – Risiken (IST)
- **Generic Fallback**: Resolver kann bei unbekannten Symbolen auf `genericSwingPlaybook` fallen → Risiko falscher Schwellen. (index.ts, Fallback-Zweig).  
- **Label-bedingte Fallbacks**: Wenn Asset-Label im Coverage nicht gepflegt ist, kann Swing als generic laufen (`playbook-coverage-report.md`).  
- **Event Data Availability**: Swing Event Window 24h; fehlende Events im Window könnten Blocks auslassen (perceptionEngine event fetch).  
- **Refinement Leakage**: Guard verhindert 4H im Core; falls TimeframeConfig geändert wird (z.B. 1D+4H als Core), fail-fast Tests würden greifen (swingGuard tests).  
- **Orderflow Dependence**: Intraday orderflow neutralisiert; falls future changes re-enable negative flags, könnte Swing Noise steigen (orderflowMetrics).  

## 7) Empfehlungen (ohne Umsetzung)
- **Shift auf 1D+4H als Standard**: 
  - Anpassung `timeframeConfig.getSwingCoreTimeframes` → 1D+4H, 1W als optionaler Macro-Context; ensure guards/tests updated.  
  - MarketMetrics: separater Pfad für 4H-Core-Drift/Tensile tests.  
- **Tests für Regression**: 
  - Snapshot-level tripwire: Swing snapshot should not request 15m/1H; verify 4H-only refinement.  
  - Playbook selection audit: asset→playbook mapping against coverage table.  
  - Levels delta test: 4H refinement must stay within ±20% band change.  
- **Metrik/Report Erweiterung**: 
  - Decision distribution (TRADE/WATCH/BLOCKED) pro Swing asset/timeframe to track NoiseRate.  
  - Event-block rate (percentage of setups blocked by execution_critical within 24h).  
  - Refinement effectiveness: compare RRR / bandPct with vs. without 4H in periodic report.  

## 8) Fundstellen (Kurzreferenz)
- Snapshot Build Factory: `src/server/perception/perceptionEngineFactory.ts`
- Cron Swing Backfill: `app/api/cron/snapshots/backfillSwing/route.ts`
- Datasource Guards & Timeframes: `src/lib/engine/perceptionDataSource.ts`, `src/server/marketData/timeframeConfig.ts`
- Metrics (Swing-only use of 1D/1W): `src/lib/engine/marketMetrics.ts`
- Orderflow Neutral/Soft: `src/lib/engine/orderflowMetrics.ts`, `src/lib/engine/perceptionDataSource.ts` (neutralizeStaleMinutes)
- Levels + 4H Refinement: `src/lib/engine/levels.ts`
- Event Modifier / Window 24h: `src/lib/engine/modules/eventModifier.ts`, `src/lib/config/setupProfile.ts` (event windows)
- Playbooks & Resolver: `src/lib/engine/playbooks/index.ts`
- Decision SoT: `reports/architecture/decision-single-source.md`, `features/perception/build/buildSetups.ts`
- Coverage Doc: `docs/playbook-coverage-report.md`
