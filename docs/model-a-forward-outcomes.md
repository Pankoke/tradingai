# Model A – Forward Outcomes (ab 2026-01-01)

## Idee
- Keine historische Rekonstruktion: Outcomes werden nur f\u00fcr Snapshots erstellt, die **ab 2026-01-01 (UTC)** entstehen.
- Alle Kennzahlen/Calibration verwenden die Forward-Kohorte: evaluatedAt/snapshotTime \u2265 2026-01-01 und outcomeStatus != `invalid`.
- Engine-Version wird mitgespeichert, damit Vergleiche zwischen Versionen (v02/v03/...) nur auf konsistenten Daten basieren.

## Policy
- Quelle: `src/server/services/outcomePolicy.ts`
- Default-Datum: `OUTCOMES_VALID_FROM` Env oder `2026-01-01T00:00:00Z`.
- Helper: `isOutcomeInCohort({ evaluatedAt, snapshotTime, outcomeStatus })` \u2192 false bei `invalid` oder vor Stichtag.

## Engine-Version
- Snapshots haben `version` (SNAPSHOT_VERSION).
- Outcomes speichern `setupEngineVersion` (Snapshot-Version oder `SETUP_ENGINE_VERSION` Fallback).
- `gradeDebugReason` tr\u00e4gt `engine=<version>`.
- Single Source of Truth: Outcomes liegen in der DB (`setup_outcomes`); Artefakte sind nur historische Snapshots (siehe `docs/single-source-of-truth.md`).

## Runner / Commands
- Outcome-Runner nutzt Policy (Stichtag) und setzt `setupEngineVersion` beim Upsert.
- CLI: `npm run outcomes:run -- --days=30 --playbookId=gold-swing-v0.2 --limit=500` (optional `--from=2026-01-01`).
- Backfill Engine-Version: `npm run outcomes:backfill-engine -- --limit=1000` füllt `setup_engine_version` aus `perception_snapshots.version` nach (default nur Forward-Kohorte, `--all` entfernt den Filter).

## Admin-Auswertungen
- Threshold-/Calibration-Services filtern standardm\u00e4\u00dfig auf Forward-Kohorte (>= Stichtag, ohne `invalid`).
- Engine-Health Page gruppiert nach `playbookId` und `setupEngineVersion` und zeigt HitRate/Expiry/Coverage.

## Interpretation
- HitRate = TP/(TP+SL), ExpiryRate = Expired/Closed, Coverage = Closed/Total.
- `invalid` bedeutet Preis-Skalen-Mismatch oder Dateninkonsistenz \u2192 wird aus Kennzahlen ausgeschlossen.
- Ambiguous bei TP&SL in derselben Candle: konservative Gap-/Body-Regel versucht Reihenfolge; nur falls unentscheidbar bleibt `ambiguous` (Details in outcomes-audit).

## Nicht-Ziele
- Keine automatische L\u00f6schung alter Outcomes.
- Keine nachtr\u00e4gliche Rekonstruktion alter Snapshots.
