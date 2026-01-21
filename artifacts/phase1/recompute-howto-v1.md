# Recompute / Backfill How-To (Swing, 1D/1W) — v1

Ziel: Swing-Snapshots/Decisions/Outcomes neu berechnen, damit persistierte Dimensionen (playbookId/decision/grade/…​) in historischen Daten landen. Keine Annahmen – nur belegte Pfade aus dem Repo.

## Maintenance API Endpoints

- **Recompute decisions (setups in snapshots)**
  - Route: `POST /api/admin/maintenance/recompute-decisions`
  - File: `src/app/api/admin/maintenance/recompute-decisions/route.ts`
  - Auth: `Authorization: Bearer $CRON_SECRET` (oder `ADMIN_API_TOKEN`), runtime: nodejs
  - Query params:
    - `assetId` (default `spx`, lowercased)
    - `timeframe` (default `1D`, uppercased)
    - `days` (default `30`)
    - `label` (default `swing`; special values `(null)`/`__null__` match null/empty; substring match otherwise)
  - Wirkung: Lädt `perceptionSnapshots` im Fenster, ruft `recomputeDecisionsInSetups` ( `src/server/admin/recomputeDecisions.ts` ), schreibt zurück in `perception_snapshots.setups` nur wenn geändert. Debug-Meta in dev (labelsTop, sampleSetups, postCheck).

- **Backfill Swing snapshots (rebuild snapshots)**  
  - Route: `POST /api/cron/snapshots/backfillSwing`
  - File: `src/app/api/cron/snapshots/backfillSwing/route.ts`
  - Auth: `Bearer $CRON_SECRET` (if set)
  - Query params:
    - `days` (default 30), `limit` (default 500, max 200), `dryRun=1`, `force=1` to overwrite existing, `assetId` filter (resolved via `resolveAssetIds`, gold aliases), `recentFirst=1`, `debug=1`
  - Wirkung: ruft `buildAndStorePerceptionSnapshot` (profiles: `["SWING"]`) per Tag. Schreibt/überschreibt snapshots inkl. setups JSON (jetzt mit playbookId/grade/decision/alignment/reasons/segment wenn zur Laufzeit vorhanden).

- **Backfill outcomes**
  - Route: `POST /api/cron/outcomes/backfill`
  - File: `src/app/api/cron/outcomes/backfill/route.ts`
  - Auth: `Bearer $CRON_SECRET` (required)
  - Query params:
    - `daysBack` (default 730), `limitSetups` (default 200, max 2000), `dryRun`, `assetId`, `playbookId`, `debug`
  - Wirkung: `runOutcomeEvaluationBatch` ( `src/server/services/outcomeEvaluationRunner` ), schreibt/aktualisiert `setup_outcomes` und `audit_run`. Debug liefert eligibility stats.

## Scripts (Node/ts-node)

- **Swing snapshot backfill (scripts)**
  - File: `src/scripts/backfillSwingSnapshots.ts`
  - Run: `ts-node --project scripts/tsconfig.scripts.json src/scripts/backfillSwingSnapshots.ts --days=30 --force`
  - Params: days, limit, dryRun, force, asset filter (see script).

- **Outcome backfill (engine v14/v15 debug)**
  - Files: `scripts/outcomes_backfill_engine_v14.ts`, `scripts/outcomes_backfill_engine_v15.ts`
  - Purpose: legacy outcome backfill runners (engine versions), invoke via ts-node with params inside scripts.

## Empfohlener Weg für Phase-1 Backfill (Swing 30–60d)

1. **Snapshots neu aufbauen (optional, wenn Setups veraltet):**  
   `curl -X POST "$BASE_URL/api/cron/snapshots/backfillSwing?days=60&force=1&recentFirst=1" -H "Authorization: Bearer $CRON_SECRET"`
   - Baut SWING-Snapshots neu und persistiert playbookId/grade/decision/... in `perception_snapshots.setups`.

2. **Decisions neu berechnen (setzt Setup-Decisions/Reaons/Segment in setups JSON):**  
   Für jedes Asset/TF/Label wie gebraucht, z. B.  
   `curl -X POST "$BASE_URL/api/admin/maintenance/recompute-decisions?assetId=wti&timeframe=1D&days=60&label=eod" -H "Authorization: Bearer $CRON_SECRET"`  
   Wiederhole für labels `us_open`, `morning`, `(null)` und ggf. TF `1W`.

3. **Outcomes backfill (falls Outcomes angepasst werden sollen):**  
   `curl -X POST "$BASE_URL/api/cron/outcomes/backfill?daysBack=180&limitSetups=500&assetId=wti" -H "Authorization: Bearer $CRON_SECRET"`

Empfehlung: Reihenfolge wie oben (Snapshots → Decisions → Outcomes) für konsistente Setup-Dimensionen.

## Parameter-Referenz (Kurz)
- `assetId`: lowercase; aliases nur im snapshot backfill (gold).
- `timeframe`: `1D`/`1W` für Swing; recompute-decisions uppercased intern.
- `label`: substring-match außer `(null)`/`__null__` (match null/empty).
- `force`: backfillSwing überschreibt bestehende Snapshots.
- `dryRun`: 1/true führt nur Zählung durch.

## Verwendete Dateien (Belege)
- `src/app/api/admin/maintenance/recompute-decisions/route.ts`
- `src/server/admin/recomputeDecisions.ts`
- `src/app/api/cron/snapshots/backfillSwing/route.ts`
- `src/app/api/cron/outcomes/backfill/route.ts`
- `src/scripts/backfillSwingSnapshots.ts`
- `scripts/outcomes_backfill_engine_v14.ts`, `scripts/outcomes_backfill_engine_v15.ts`
