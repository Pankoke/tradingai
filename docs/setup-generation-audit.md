# Setup-Generation Audit (Swing/1D, Gold-Swing Kontext)

## Datenfluss (High-Level)
1) **Snapshot Build** (`src/features/perception/build/buildSetups.ts`)
   - Ruft `buildPerceptionSnapshot` auf (Perception-Engine).
   - Snapshot-Metadaten: `version` = `SNAPSHOT_VERSION` (`v1.0.0`), `dataMode`, `snapshotTime`, `label`.
   - Active Assets werden geladen (`getActiveAssets`), Symbol→assetId Mapping wird verwendet.
   - Ring-Berechnungen: `computeRingsForSetup`, `computeSetupScore`, `computeSetupConfidence`, `computeSignalQuality`, `buildRingAiSummaryForSetup`.
   - Levels: `computeLevelsForSetup` (siehe unten) → `entryZone`, `stopLoss`, `takeProfit`, `riskReward`, Debug.
   - Playbook: `resolvePlaybookWithReason` (abgeleitet aus asset.id/symbol/name + profile). Ergebnis `setupPlaybookId`.
   - Grade: `evaluateSetup` per Playbook (z. B. Gold Swing v0.2).
   - Persistenz: Snapshot (`perception_snapshots`) + Items (`perception_snapshot_items`).

2) **Setup-Level-Berechnung** (`src/lib/engine/levels.ts`)
   - Inputs:
     - `referencePrice`: Zahl > 0 (Mid/Close aus Perception Engine).
     - `direction` (long/short), `volatilityScore` (0–100), `confidence` (0–100), `category` (pullback/breakout/range/etc.), `profile`.
   - Base-Band per Category: pullback 0.7%, breakout 0.9%, range 0.6%, trendContinuation 0.8%, liquidityGrab 1.1%, unknown 0.6%.
   - Profile-Scaling: INTRADAY 0.65, sonst 1.0.
   - Volatility/Confidence-Faktoren:
     - volFactor = clamp(0.5 + volNorm*1.5, 0.5, 2.0)
     - stopFactor = clamp(1.3 - confNorm*0.6, 0.7, 1.3)
     - targetFactor = clamp(1.0 + confNorm*1.5, 1.0, 2.5)
   - BandPct = baseBand * profileScale * volFactor.
   - Entry-Zone: `[price*(1-bandPct), price*(1+bandPct)]` (Long) bzw. invertiert (Short), sortiert, gerundete Präzision per Größenordnung.
   - StopLoss: `entryLow - baseBand*stopFactor*price` (Long) bzw. `entryHigh + ...` (Short).
   - TakeProfit: `entryHigh + baseBand*targetFactor*price` (Long) bzw. `entryLow - ...` (Short).
   - Risk/Reward: Prozent-Risiko/Reward relativ zum Entry, RRR = rewardPercent/riskPercent; Volatility-Label: low/medium/high ab Scores (<40/≥40/≥70).
   - Edge Cases: Ungültiger referencePrice → Levels null, Debug mit baseBand/bandPct null.

3) **Grade/NO_TRADE (Gold-Swing v0.2)** (`src/lib/engine/playbooks/index.ts`, evaluateGoldSwing)
   - Basis-Gates (NO_TRADE, erste Verletzung gewinnt):
     - biasScore < 65 → NO_TRADE ("Bias too weak (<65)"); A-Schwelle 75
     - trendScore < 45 → NO_TRADE
     - signalQuality < 50 → NO_TRADE
     - fehlende Levels/RiskReward → NO_TRADE
    - eventModifier execution_critical im 24h-Fenster → NO_TRADE
  - Hard Knockouts → NO_TRADE:
    - signalQuality unter Schwelle
    - riskReward rrr < 1
  - Soft Negatives → Downgrade zu B:
    - trend/bias Konflikt + orderflow negativ (nur bei vorhandenem Orderflow)
    - orderflow negativ
    - trend/bias Divergenz (soft, ab Δ ≥ 25)
    - sentiment schwach
   - A: Alle Basis ok, keine Soft-Negatives. B: Basis ok, aber Soft-Negatives vorhanden.
   - SetupType: pullback_continuation (trend>=45 & bias>=65), range_bias (bias>=65), sonst unknown.

4) **Engine-Version**
   - Snapshot-Feld `version` aus `SNAPSHOT_VERSION` (derzeit `v1.0.0`).
   - Outcome-Engine-Version (SETUP_ENGINE_VERSION) wird nicht in Snapshot gespeichert, aber als Debug-Suffix beim Outcome geschrieben (engine=<…>), falls gesetzt.

## Eingangs-Daten/Features
- Ring Scores: biasScore, trendScore, sentimentScore, orderflowScore.
- Signal Quality: `computeSignalQuality(setup).score`.
- Confidence: `computeSetupConfidence` + Score/Debug.
- Reference Price: aus Perception-Engine (nicht in dieser Datei ersichtlich, aber als `referencePrice` an computeLevelsForSetup übergeben).
- EventModifier: classification + primaryEvent Minuten bis Event.
- Orderflow Flags/Reasons: negativ, Konflikte etc.

## Default Swing Gates (evaluateDefault)
- Bias >= 65 und Trend >= 40 → Grade B.
- Darunter: NO_TRADE, aber Richtung wird weiterhin aus Bias abgeleitet (LONG bei Bias ≥ 50, sonst SHORT).

## SPX/DAX/NDX/DOW Swing Gates (volatility & thresholds)
- Regime muss TREND sein; RANGE bleibt WATCH (keine harten Blocks).
- Volatilität: `high` → NO_TRADE (hard); `medium` → soft (kein Hard-KO, ggf. Watch/Downgrade).
- Schwellen: Bias ≥ 65, Trend ≥ 55, SignalQuality ≥ 50, Confirmation (orderflow) ≥ 50.

## Offene Risiken/Unklarheiten
- Reference Price Herkunft: in buildSetups aus Perception Engine, Quelle (welcher Feed) nicht direkt dokumentiert.
- Asset-Provider-Mapping: Candles für Outcomes nutzen `assetId`; sicherstellen, dass Asset-IDs den gleichen Preisfeed wie Level-Build verwenden.
- Engine-Versionierung: Snapshot hat `version` (v1.0.0), aber keine separate `engineVersion` Spalte. Outcome-Debug trägt SETUP_ENGINE_VERSION, falls gesetzt.
- Ambiguous Intrabar: Levels nutzen nur OHLC, keine Sequenz; Reference Price könnte von anderem Feed stammen → mögliche Skalen-Mismatch (siehe Outcome-Invalid-Checks).
