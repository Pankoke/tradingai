# GitHub Actions Inventory (v1) — TradingAI

Stand: aktueller Repo-Status. Alle Zeiten Cron = UTC. Keine Code-Änderungen, reine Bestandsaufnahme.

## Übersichtstabelle
| Workflow (file) | Trigger | Zweck (Kurz) | Secrets/Env | Externe Calls |
| --- | --- | --- | --- | --- |
| bias-sync-cron.yml | schedule `45 23,5,11,17 * * *`, dispatch | Bias Snapshot Sync | `BIAS_SYNC_URL`, `CRON_SECRET` | POST Bias Sync endpoint |
| cleanup-cron.yml | schedule `30 1 * * *`, dispatch | Cleanup Dry-Run | `CLEANUP_CRON_URL`, `CRON_SECRET` | POST Cleanup cron |
| events-enrich.yml | schedule `0 2 * * *`, dispatch | Events ingest + enrich | `EVENTS_INGEST_URL`, `EVENTS_ENRICH_URL`, `CRON_SECRET` | POST ingest + enrich endpoints |
| marketdata-cron.yml | schedule `15 23,5,11,17 * * *`, dispatch | Daily marketdata sync | `MARKETDATA_SYNC_URL`, `CRON_SECRET` | POST marketdata sync |
| marketdata-intraday-cron.yml | schedule `0 * * * *`, dispatch | Intraday marketdata sync (hourly) | `MARKETDATA_INTRADAY_SYNC_URL`, `CRON_SECRET` | POST intraday marketdata |
| outcomes-evaluate.yml | schedule `10 6 * * *`, dispatch | Outcome evaluation (Swing 1D, daysBack=90, limit=500) | `CRON_SECRET`, `OUTCOME_CRON_BASE_URL` (vars or secrets) | POST `/api/cron/outcomes/evaluate` |
| perception-cron.yml | schedule `0 0,6,12,18 * * *`, dispatch | Perception Snapshots (swing) | `CRON_ENDPOINT_URL`, `CRON_SECRET` | GET/POST perception endpoint |
| perception-intraday-cron.yml | schedule `5 * * * *`, dispatch | Intraday perception build (hourly) | `PERCEPTION_INTRADAY_SYNC_URL`, `CRON_SECRET` | POST intraday perception |
| phase0-monitor.yml | schedule `0 6 * * 1`, dispatch | Phase0 monitor + weekly report build/push | `BASE_URL`, `CRON_SECRET`, `GITHUB_TOKEN` | GET Phase0 endpoints, build weekly MD, push commit, upload artifacts |

Concurrency: heavy jobs share `cron-heavy-jobs`; intraday marketdata/perception have dedicated groups.

## Workflow-Details (High Level)
- **bias-sync-cron**: single curl POST to `$BIAS_SYNC_URL` with Bearer `$CRON_SECRET`; timeout 360s; no checkout.
- **cleanup-cron**: POST to `$CLEANUP_CRON_URL` with Bearer; fails early if env missing.
- **events-enrich**: two sequential POSTs (ingest, enrich); secrets trimmed for CRLF; both require `CRON_SECRET`.
- **marketdata-cron**: POST `$MARKETDATA_SYNC_URL` with Bearer; timeout 360s.
- **marketdata-intraday-cron**: hourly POST `$MARKETDATA_INTRADAY_SYNC_URL` with Bearer.
- **outcomes-evaluate**: daily 06:10 UTC; constructs URL from `OUTCOME_CRON_BASE_URL` (var or secret) defaulting to `/api/cron/outcomes/evaluate?daysBack=90&limit=500`; POST with `CRON_SECRET`; prints response; single job.
- **perception-cron**: 4× daily; curl to `$CRON_ENDPOINT_URL` with Bearer; 360s timeout.
- **perception-intraday-cron**: hourly +5 min; POST `$PERCEPTION_INTRADAY_SYNC_URL` with Bearer.
- **phase0-monitor**: weekly Mon 06:00 UTC. Steps: checkout, node 20, npm install, validate `BASE_URL`, fetch phase0 JSON for gold/btc with Bearer `$CRON_SECRET`, run `scripts/build-weekly-health-report.ts`, capture `REPORT_FILE`, upload artifacts (phase0 jsons + report), commit/push report, uses `contents: write`.

## Risiken / Beobachtungen
- Outcome evaluation runs daily with limit=500, daysBack=90: kann viele Setups offen lassen (OPEN Anteil hoch) und ggf. Assets nicht abdecken. Kein weekly/deep run.
- Perception/Marketdata intraday/daily können überlappen; concurrency nur teilweise getrennt.
- Phase0 monitor commit kann fehlschlagen, wenn remote ahead; push rejection risk.
- Secrets müssen für jede Umgebung gesetzt sein (BASE_URL, CRON_SECRET, endpoint URLs); kein fallback logging außer missing-secret checks.
- Keine Phase-1 Artefakt-Jobs (join-stats, swing analysis, performance breakdown) automatisiert.

## Abgleich mit Zielplan (empfohlen)
- **Daily** (UTC Vorschlag 06:30, nach perception + outcomes): outcomes backfill/evaluate for all swing assets, then phase1 analyze (join-stats + swing-outcome-analysis + performance-breakdown), upload artifacts.
- **Weekly** (UTC Vorschlag Mon 07:00): deep run (daysBack 365, higher limits), phase1 reports, upload artifacts.
- **Manual**: workflow_dispatch for snapshots backfill swing + recompute-decisions (already separate endpoints, no workflow yet).

## Empfohlene Erweiterungen (keine Umsetzung in v1)
- Neuer workflow “phase1-reports” with schedule + dispatch to run scripts: `npm run phase1:join-stats`, `npm run phase1:analyze:swing`, `npm run phase1:performance:swing`, upload artifacts.
- Optional workflow “outcomes-backfill” calling `/api/cron/outcomes/backfill` (daysBack 180, limit 500 per asset) before analysis.
- Consider concurrency guards to avoid overlap of perception/outcomes jobs.

## Secrets / Env Checkliste
- CRON_SECRET (alle cron calls)
- BIAS_SYNC_URL, CLEANUP_CRON_URL, EVENTS_INGEST_URL, EVENTS_ENRICH_URL
- MARKETDATA_SYNC_URL, MARKETDATA_INTRADAY_SYNC_URL
- PERCEPTION_INTRADAY_SYNC_URL, CRON_ENDPOINT_URL
- OUTCOME_CRON_BASE_URL (or vars)
- BASE_URL (phase0 monitor fetch/build)
- GITHUB_TOKEN (commit/push in phase0 monitor)

## How to verify locally (manual checks)
- Review workflow_dispatch runs in GitHub Actions UI.
- Trigger manual runs to ensure secrets configured and endpoints respond 2xx.
- Inspect artifacts from phase0-monitor for weekly report freshness.
