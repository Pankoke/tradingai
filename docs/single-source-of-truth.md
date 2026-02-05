# Single Source of Truth (SoT) – Outcomes & Backtests

## Grundprinzip
- **Datenbank (Postgres/Drizzle)** ist die einzige Quelle der Wahrheit für:
  - `setup_outcomes` (Outcome-Status, Zeitpunkte, Gründe, Engine-Version)
  - `backtest_runs` + Exporte (CSV/Comparison)
  - Snapshot-/Setup-Metadaten, die Outcomes referenzieren (snapshot_id, setup_id)
- **Artifacts/Reports** (z. B. `artifacts/phase0-*`, `artifacts/phase1/*`, exportierte CSV/MD) sind **read-only Snapshots** zu Analyse-/Audit-Zwecken. Sie dürfen nicht als aktuelle Wahrheit interpretiert werden.

## Fluss & Verantwortlichkeiten
- **Cron Outcomes Evaluate** (`/api/cron/outcomes/evaluate`):
  - Lädt Kandidaten-Snapshots aus DB, prüft Freshness, bewertet Outcomes via `runOutcomeEvaluationBatch`, schreibt in `setup_outcomes`.
  - Siehe `src/app/api/cron/outcomes/evaluate/route.ts`, `src/server/services/outcomeEvaluationRunner.ts`.
- **Cron Outcomes Backfill** (`/api/cron/outcomes/backfill`):
  - Füllt fehlende Outcomes in DB nach, ebenfalls ausschließlich gegen DB-Snapshots.
- **Admin Backtest APIs** (`/api/admin/backtest/*`):
  - Lesen/Schreiben von `backtest_runs` in DB, Exporte bauen auf DB-Inhalten (keine Artifacts als Input).
- **Admin Outcomes / Reports**:
  - UI/Exports beziehen Outcome-Zahlen aus DB (Aggregationen über `setup_outcomes`), nicht aus Artefakten.

## Model A – Forward Outcomes
- Gültigkeitsfenster: Outcomes werden für Snapshots **ab 2026-01-01 UTC** als primäre Kohorte genutzt (`OUTCOMES_VALID_FROM`).
- Filter: Kennzahlen berücksichtigen standardmäßig keine `invalid` Outcomes und respektieren den Stichtag (siehe `docs/model-a-forward-outcomes.md`).
- Engine-Version: Jede Outcome-Zeile trägt `setupEngineVersion`; Vergleiche/Exports nutzen diese Versionierung.

## Ambiguous / Expired / Missing – Risiken & Zählweise
- **ambiguous**: TP & SL im selben Bar, Reihenfolge unklar → bleibt ambiguous, außer die Gap/Body-Heuristik kann deterministisch lösen (Details: `docs/outcomes-audit.md`).
- **expired**: Kein Treffer innerhalb des definierten `windowBars`; zählt als geschlossenes Outcome, aber weder TP noch SL.
- **invalid**: Preis-Skalen-Mismatch oder Datenfehler → wird für Kernmetriken ausgeschlossen.
- **open**: Bewertungsfenster zu kurz / Candles fehlen.

## Do & Don't
- **Do**: Für aktuelle KPIs, Exporte, Admin-Ansichten immer DB-Queries verwenden.
- **Don’t**: Artefakte als “aktuelle” Outcomes interpretieren oder in Admin-Flows einspeisen.
- **Kennzeichnung**: Wenn ein Tool/Script Artefakte nutzt, klar als “artifact view” labeln und nicht mit Live-KPIs vermischen.

## Referenzen
- Outcomes Engine: `src/server/services/outcomeEvaluator.ts`
- Runner & Cron: `src/server/services/outcomeEvaluationRunner.ts`, `src/app/api/cron/outcomes/evaluate/route.ts`
- Forward Policy: `docs/model-a-forward-outcomes.md`
- Ambiguous-Auflösung & Audit: `docs/outcomes-audit.md`
