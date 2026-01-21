# Phase-1 Linking Audit (Readiness Check, Analyse-only)

Stand: 2026-01-21. Quelle: Repo-Fundstellen (kein DB-Query).

## A) Datenmodell (Tabellen/Schemata)
- `perception_snapshots` (drizzle/0001_schema_extend.sql, 0003_add_setups_column.sql)
  - Felder: id (PK), snapshot_time, label, version, data_mode, generated_ms, notes, created_at, setups jsonb (Setups-Array).
- `perception_snapshot_items` (drizzle/0001_schema_extend.sql)
  - Felder: id (PK), snapshot_id (FK -> perception_snapshots), asset_id (FK -> assets), setup_id, direction, rank_overall, rank_within_asset, score_total, score_trend/momentum/volatility/pattern, confidence, bias_score_at_time, event_context jsonb, is_setup_of_the_day, created_at.
- `setup_outcomes` (schema-Details über Migrationen 0007–0009)
  - Unique Index: (snapshot_id, setup_id) (0007_setup_outcomes_composite_unique.sql).
  - Felder ergänzt: setup_engine_version (0008), evaluation_timeframe (0009), risk_reward (0002), bias_score (0004), ring_ai_summary (0005), event_enrichment (0006).
- `bias_snapshots` (drizzle/0001_schema_extend.sql)
  - Felder: id, asset_id, date, timeframe, bias_score, confidence, trend_score?, volatility_score?, range_score?, meta jsonb, created_at. Unique Index (asset_id, date, timeframe).
- Assets/Candles: Grundtabellen aus 0000_init.sql (assets, candles).

Referenzen/Keys:
- setup_outcomes referenziert Setup über (snapshot_id, setup_id) eindeutig.
- perception_snapshot_items hält setup_id + snapshot_id.
- perception_snapshots hält setups jsonb (Duplikat/Shadow der Items?).

## B) Outcome/Status-Definition (Fundstellen, nicht geöffnet)
- Outcome-Logik vermutet in `src/src/server/admin/outcomeService` (Engine Health import) und Cron endpoints unter `src/app/api/cron/outcomes/*`.
- Status-Felder sichtbar in Phase-0 Summaries: hit_tp, hit_sl, open, expired, ambiguous (Phase-0 route aggregates).
- Evaluation timeframe (evaluation_timeframe) existiert in setup_outcomes (0009).
- Keine explizite Dokumentation für “closed/expired” in Repo-Dateien durchsucht; müsste in outcome service/calc stehen.

## C) Admin-Queries (woher stammen Metriken)
- Weekly Health Reports: Filesystem-basierte Reports unter `reports/weekly/*.md`; Admin-Seite `src/app/[locale]/admin/(panel)/monitoring/reports/page.tsx` listet FS, Detailseite rendert Markdown. Daten stammen aus Phase-0 Summaries (API `/api/admin/playbooks/phase0-gold-swing`) via Generator `scripts/build-weekly-health-report.ts`.
- Engine Health (Forward Cohort): `src/app/[locale]/admin/(panel)/outcomes/engine-health/page.tsx` ruft `loadEngineHealth` aus `src/src/server/admin/outcomeService`; Query-Parameter: days, assetId, playbookId, engineVersion, includeUnknown, includeNullEvalTf.
- Playbook Calibration: `src/app/[locale]/admin/(panel)/playbooks/calibration/page.tsx` ruft `loadCalibrationStats` (`src/src/server/admin/calibrationService`); Filter: playbook, profile, days, assetId.
- Playbook Thresholds: `src/app/[locale]/admin/(panel)/playbooks/thresholds/page.tsx` nutzt `loadGoldThresholdRecommendations` und `loadThresholdRelaxationSimulation`; Gold-fokussiert, Simulation grids.
- Coverage/Audit: `scripts/audit-playbook-coverage.ts` scannt perception_snapshots (snapshot_time) und resolved Playbook via resolver in `src/lib/engine/playbooks/index.ts`.

## D) Linking-Optionen (Bewertung)
1) `setup_outcomes.setup_id` + `snapshot_id` (direkter FK-Pfad, Index vorhanden):
   - Voraussetzung: Items/Setups tragen gleiche setup_id wie Outcomes. Join-Rate messbar über COUNT outcomes vs DISTINCT items.
   - Failure: outcomes ohne passenden snapshot/setup oder doppelte setup_id über Snapshots (Index schützt Doppel pro Snapshot).
2) `snapshot_id` only:
   - Schwächer; mehrere Setups pro Snapshot -> Mehrdeutig.
3) Composite (assetId + timeframe + label + timestamp bucket):
   - Heuristisch; Risiko falscher Zuordnung, besonders bei FX/Index mit ähnlichen Labels.
4) Deterministischer linkKey (hash) in Setup + Outcome:
   - Nicht vorhanden; bräuchte Schema-Änderung.
5) Nearest-time heuristic:
   - Nur Fallback; hohes Risiko falscher Links.

Empfehlung: Primär Option 1 (snapshot_id + setup_id), Join-Rate als KPI; Option 3 nur als Debug-Fallback.

## E) Phase-0 Artefakt-Lage (für Phase-1 Reuse)
- Baseline JSON: `artifacts/phase0-baseline/2026-01-21T09-31-26-330Z.json` enthält per Asset: decisionDistribution, gradeDistribution, watchSegmentsDistribution (falls vorhanden), alignmentDistribution (FX), reason distributions, labelsUsedCounts.
- Verify Script: `scripts/verify-swing-coverage-clean.ts` erzeugt verify-swing-coverage-clean-v2.{json,md}; prüft Swing-Coverage, FX Alignment Flag.
- Reports: Weekly Health Reports liegen als Markdown unter `reports/weekly/*` und werden in Admin angezeigt.

## F) Join-Readiness Fragen (offen)
- Liegen in outcomes zuverlässige setup_id + snapshot_id Werte? (muss in outcomeService / cron geprüft werden).
- Gibt es Outcomes ohne setup_id? (Join-Rate unbekannt).
- Welche Zeitfelder nutzen Outcomes (evaluatedAt, evaluation_timeframe) vs Setup snapshot_time?

## Empfehlung (Phase-1.0 Data Readiness)
- Messpunkt setzen: Join-Rate Outcome ↔ perception_snapshot_items via (snapshot_id, setup_id) für Swing 1D/1W.
- Falls Lücken: prüfen, ob outcomes fehlen oder setup_id mismatch; ggf. Backfill planen.
- Artefakt-First: Phase-1.0 kann als Script/Endpoint Outcomes-Join-Stats erzeugen (JSON/MD) bevor UI-Anpassungen.
