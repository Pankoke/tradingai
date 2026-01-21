# Phase-1.0 Plan – Data Readiness & Linking (Analyse-only)

Ziel: Join-Readiness Outcomes↔Setups messen, ohne UI/Schemas anzufassen.

## Step-by-step (Vorschlag)
1) Join-Stats Script/Endpoint
   - Name-Vorschlag: `scripts/phase1-join-stats.ts` oder API `/api/admin/phase1/join-stats`.
   - Input: days (default 30), asset/timeframe optional.
   - Output (JSON+MD Artefakt unter `artifacts/phase1/analysis-<timestamp>.{json,md}`):
     - per asset/timeframe/label: setups total, outcomes total, matched outcomes via (snapshot_id, setup_id), joinRate (%)
     - counts per decision/grade/segment/alignment (falls verfügbar)
     - top missing-reasons (if any) for unmatched outcomes (optional)

2) KPIs / Go-No-Go
   - joinRateSwing >= definierter Schwellenwert (z.B. 95%) für 1D/1W.
   - keine leeren reason-Felder in matched outcomes (Phase-0 Hygiene beibehalten).
   - FX Alignment distributions vorhanden (bestätigt durch baseline/verify).
   - Intraday out-of-scope.

3) Integration in Admin (Konzept, keine Umsetzung)
   - Engine Health: zusätzlicher Join-Rate Banner (wenn API geliefert).
   - Weekly Report: optional “Phase-1 run” Hinweis + Link zum Artefakt.
   - System/Coverage Seite: Link zu aktuellstem Phase-1 Artefakt.

4) Artefakt-Handling
   - Naming: `artifacts/phase1/analysis-YYYY-MM-DDTHH-mm-ssZ.json/md`.
   - “latest” = lexicographically max Timestamp; kein DB-Registry nötig in 1.0.

5) Data Sources (Reuse)
   - Read from DB: `perception_snapshots` (setups jsonb), `perception_snapshot_items` (setup_id per item), `setup_outcomes` (snapshot_id+setup_id).
   - Keys: primary join (snapshot_id, setup_id).
   - Time filtering: snapshot_time.

6) Open Questions
   - Outcome status semantics (hit_tp/sl/open/expired/ambiguous) – zu klären im outcomeService.
   - R/MAE/MFE Verfügbarkeit – falls nicht vorhanden, Phase-1.0 fokussiert auf joinRate + winrate only.

## Abgrenzung
- Keine Engine-/Playbook-Änderungen.
- Keine Intraday-Analysen.
- Keine CI-Guard (später möglich auf Basis des Join-Stats Artefakts).
