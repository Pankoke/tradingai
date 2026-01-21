# Phase-1 Storage Decision (DB vs Artefakt)

Stand: 2026-01-21. Ziel: Phase-1.0 (Join-Readiness) ohne sofortige Schema-Änderungen.

## Ist-Lage
- Phase-0 Reports: FS-basiert (`reports/weekly/*.md`), erzeugt von `scripts/build-weekly-health-report.ts`, gerendert im Admin (Monitoring/Reports).
- Baseline: JSON unter `artifacts/phase0-baseline/<timestamp>.json` (Summaries per Asset inkl. alignmentDistribution/Reasons/Segments).
- Audit/Verify: Text/Markdown/JSON unter `artifacts/coverage/*` (playbook audit, swing-coverage verify).
- DB: perceptions/outcomes in Postgres (Drizzle migrations). Outcomes speichern (snapshot_id, setup_id, evaluation_timeframe, risk_reward, setup_engine_version ...).

## Optionen
1) Artefakt-first (Phase-1.0)
   - Script/Endpoint berechnet Join-Rate und Outcome-Stats → schreibt JSON/MD unter `artifacts/phase1/analysis-<timestamp>.{json,md}`.
   - Admin UI zeigt Links zu Artefakten (wie Weekly Reports), kein DB-Registry nötig.
   - Pro: kein Schema-Change, schnell. Contra: Historie/Filter nur per FS.

2) DB-Registry light (Phase-1.1+)
   - Kleine Tabelle `analysis_runs` (id, type, params, artifact_path, created_at).
   - Admin kann “latest run” anzeigen; Artefakt bleibt Quelle.
   - Pro: Discoverability. Contra: minimaler DB-Aufwand.

3) Full DB Aggregates (später)
   - Outcomes/joins voraggregiert pro asset/playbook/segment → queriable im Admin.
   - Pro: UI-Drilldowns performant. Contra: mehr ETL/Schema.

## Empfehlung
- Phase-1.0: Artefakt-first (Option 1) + klarer Dateipfad/Schema, ohne DB-Änderung.
- Optional Phase-1.1: Registry-Light (Option 2), wenn Discoverability im Admin wichtig wird.
- Phase-1.2+: Full Aggregates nur, wenn KPIs stabil definiert sind.
