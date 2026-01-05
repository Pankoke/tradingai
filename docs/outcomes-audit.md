# Outcomes Audit (Gold Swing, SWING/1D)

## Datenfluss (Überblick)
1) **Snapshot Build**  
   - Quelle: `src/features/perception/build/buildSetups.ts` erzeugt Snapshots mit Setups (inkl. Levels, Profile, Timeframe, Playbook-Id, Grades).  
   - Persistenz: `perception_snapshots` + `perception_snapshot_items`.

2) **Outcome Runner**  
   - Entry: `src/server/services/outcomeEvaluationRunner.ts` (`loadRecentSwingCandidates` + `runOutcomeEvaluationBatch`).  
   - Filter: Profile `SWING`, Timeframe `1D`, optional Asset-Filter (z. B. Gold Mapping) + Playbook-Family.  
   - Dedupe: pro `snapshotId|setupId`.  
   - Outcome-Berechnung: `evaluateSwingSetupOutcome` (siehe unten).  
   - Persistenz: `upsertOutcome` → Tabelle `setup_outcomes` (PK `id`, Unique `snapshot_id + setup_id`).

3) **Outcome Logik (Compute)**  
   - Datei: `src/server/services/outcomeEvaluator.ts`  
   - Eingaben: Setup (Direction, SL/TP-Zonen), Snapshot-Zeit, Fenster `windowBars` (Default 10), 1D-Candles.  
   - Candle-Ladevorgang: `getCandlesForAsset` mit Zeitraum `(snapshotTime + 1ms)` bis `(snapshotTime + (windowBars+3) Tage)`. Setup-Candle wird explizit ausgeschlossen.  
   - Zonen: `parseZone` → `tpThreshold` / `slThreshold` (Long: TP = min/max, SL = max/min; Short: invertiert).  
   - Candles: sortiert chronologisch, erstes `windowBars`-Fenster; wenn weniger Candles → **open** mit Reason `insufficient_candles`.  
   - Per Candle (long/short jeweils High/Low-Check):  
     - `tpHit`: Long `high >= tp`, Short `low <= tp`  
     - `slHit`: Long `low <= sl`, Short `high >= sl`  
     - Beide gleichzeitig → **ambiguous**, Reason `tp_and_sl_same_candle`, `outcomeAt = candle.timestamp`, `barsToOutcome = i+1`. Keine Reihenfolge-Heuristik.  
     - Nur TP → **hit_tp**; nur SL → **hit_sl** (gleiche Zeitmarkierung).  
   - Nach Fensterende ohne Treffer → **expired** (outcomeAt null, reason null).

4) **Persistierte Felder (setup_outcomes)**  
   - Kern: `setupId`, `snapshotId`, `assetId`, `profile`, `timeframe`, `direction`, `playbookId`, `setupGrade/Type`, `evaluatedAt`, `windowBars`, `outcomeStatus`, `outcomeAt`, `barsToOutcome`, `reason`, `setupEngineVersion`.  
   - Indizes: `snapshot_id+setup_id` (unique), `asset_id+evaluated_at`, `setup_grade+outcome_status`.

5) **Cohort-Policy (Model A)**  
   - Calibration/Admin-Analysen nutzen standardmäßig nur Outcomes mit `evaluatedAt >= 2026-01-01T00:00:00Z` (env `OUTCOMES_VALID_FROM`) und `outcomeStatus != invalid`.  
   - Engine-Version wird pro Outcome gespeichert (`setupEngineVersion`) und im Debug-Reason (`engine=<...>`) mitgeführt, damit Versionen vergleichbar bleiben.

## Mögliche Fehlerquellen / Risiken
- **Ambiguous Candle**: TP & SL im selben Bar → immer `ambiguous`, keine Reihenfolge nach Open/Close.  
- **Off-by-one Start**: Setup-Candle wird ausgeschlossen (`snapshotTime + 1ms`). Ist `snapshotTime` exakt 00:00 UTC, wird die nächste 1D-Candle genutzt.  
- **Candle-Fenster**: Es werden nur die ersten `windowBars` Candles nach Sortierung genutzt. Späte Candles (nach >windowBars) werden ignoriert.  
- **Timezone**: Candle-Zeiten werden als `Date` (mit TZ) verarbeitet; Abgleich erfolgt auf UTC-Timestamps. Falsche TZ der Datenquelle könnte Verschiebungen bewirken.  
- **Preisquelle**: High/Low wird ungefiltert verwendet (kein Bid/Ask/Spread).  
- **Levels**: SL/TP aus Zonen (min/max). Falsche Zonen (z. B. invertiert) wirken direkt auf Outcome.  
- **Expiry-Definition**: Nach `windowBars` Candles → `expired`, nicht nach Kalendertagen.  
- **Insufficient Candles**: Wenn < `windowBars` Candles geladen werden, Outcome bleibt **open** mit Reason `insufficient_candles` (kein weiterer Versuch).

## Relevante Dateien/Funktionen
- Outcome Runner: `src/server/services/outcomeEvaluationRunner.ts`
  - `loadRecentSwingCandidates` (Filter & Dedupe)
  - `runOutcomeEvaluationBatch` (Iterationen, Upsert)
- Outcome Logik: `src/server/services/outcomeEvaluator.ts`
  - `computeSwingOutcome`
  - `evaluateSwingSetupOutcome` (Candle Fetch + Compute)
- Repositories:
  - Snapshots: `src/server/repositories/perceptionSnapshotRepository.ts`
  - Outcomes: `src/server/repositories/setupOutcomeRepository.ts`
  - Candles: `src/server/repositories/candleRepository.ts`
- Schema: `src/server/db/schema/setupOutcomes.ts`

## Candle-Reihenfolge & Policy (Kurzfassung)
- Sortierung: aufsteigend nach `timestamp`.
- Fenster: exakt `windowBars` Candles (Default 10); weniger → `open/insufficient_candles`.
- Prüfung je Candle: High/Low gegen TP/SL, ohne Intrabar-Sequenz.
- Gleichzeitiger TP & SL Treffer → `ambiguous` (keine Annahme, welches zuerst kam).
