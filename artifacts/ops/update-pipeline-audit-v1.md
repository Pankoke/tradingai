
## Update-Pipeline Audit (v1)

**Ziel:** Dokumentiert, welche Jobs/Scheduler Prod/Dev aktuell nutzen, welche Endpoints sie aufrufen, und warum ggf. viele Outcomes noch `open` sind oder wenige Samples in Admin-Outcomes auftauchen. Nur Analyse, keine Codeänderung.

### 1) Scheduler / Trigger (GitHub Actions)
- **perception-cron.yml** — cron `0 0,6,12,18 * * *` (4x täglich). Ruft `$CRON_ENDPOINT_URL` (Bearer `CRON_SECRET`) auf. Quelle: `.github/workflows/perception-cron.yml`.
- **perception-intraday-cron.yml** — cron `5 * * * *` (stündlich +5m). POST `$PERCEPTION_INTRADAY_SYNC_URL` (Bearer `CRON_SECRET`). Quelle: `.github/workflows/perception-intraday-cron.yml`.
- **outcomes-evaluate.yml** — cron `10 6 * * *` (täglich 06:10 UTC). POST `${OUTCOME_CRON_BASE_URL}/api/cron/outcomes/evaluate?daysBack=90&limit=500` (Bearer `CRON_SECRET`). Quelle: `.github/workflows/outcomes-evaluate.yml`.
- **marketdata-cron.yml** — cron `15 23,5,11,17 * * *` (4x täglich). POST `$MARKETDATA_SYNC_URL`. Quelle: `.github/workflows/marketdata-cron.yml`.
- **marketdata-intraday-cron.yml** — cron `0 * * * *` (stündlich). POST `$MARKETDATA_INTRADAY_SYNC_URL`. Quelle: `.github/workflows/marketdata-intraday-cron.yml`.
- **bias-sync-cron.yml** — cron `45 23,5,11,17 * * *` (4x täglich). POST `$BIAS_SYNC_URL`. Quelle: `.github/workflows/bias-sync-cron.yml`.
- **events-enrich.yml** — cron `0 2 * * *` (täglich). POST `$EVENTS_INGEST_URL`, dann `$EVENTS_ENRICH_URL`. Quelle: `.github/workflows/events-enrich.yml`.
- **cleanup-cron.yml** — cron `30 1 * * *` (täglich). POST `$CLEANUP_CRON_URL`. Quelle: `.github/workflows/cleanup-cron.yml`.
- **phase0-monitor.yml** — cron `0 6 * * 1` (wöchentlich Mo 06:00 UTC). Holt Phase0 Endpoint (Gold/BTC) und baut Weekly Health Report. Quelle: `.github/workflows/phase0-monitor.yml`.

### 2) Relevante Cron/Admin Endpoints (bekannt im Repo)
- **Perception Swing**: `$CRON_ENDPOINT_URL` (von perception-cron) → baut Swing Snapshots (Profile SWING, TF 1D/1W, labels eod/us_open/morning/(null) je nach Builder).
- **Perception Intraday**: `$PERCEPTION_INTRADAY_SYNC_URL` → Intraday Snapshots.
- **Outcomes Evaluate**: `/api/cron/outcomes/evaluate?daysBack=90&limit=500` → bewertet Setups zu Outcomes, Tabelle `setup_outcomes` (Outcome-Status hit_tp/hit_sl/expired/...).
- **Phase0 Endpoint**: `/api/admin/playbooks/phase0-gold-swing?daysBack=30...` (wird in phase0-monitor.yml für Gold/BTC genutzt).
- **Backfill Swing** (manuell, nicht in CRON): `/api/cron/snapshots/backfillSwing?days=...&force=1&assetId=...` (per Backfill-Runbook; nicht automatisch auf GitHub Actions).
- **Recompute Decisions** (manuell): `/api/admin/maintenance/recompute-decisions?assetId=...&timeframe=1D&days=...&label=...` (setzt Decisions/Reasons neu, fasst Playbook nicht an).

### 3) Pipeline (Soll laut Workflows)
1. **Marketdata/Bias/Events** laufen mehrmals täglich → Basisdaten aktualisiert.
2. **Perception Swing** 4x/Tag baut Snapshots.
3. **Outcomes Evaluate** 1x/Tag bewertet Outcomes (bis 90 Tage rückwärts, Limit 500) → kann Ursache für viele `open` sein, wenn mehr als 500 Setups/Tag oder wenn Fenster/Limit zu klein.
4. **Phase0 Monitor** 1x/Woche baut Weekly Report (Gold/BTC) — andere Assets nur indirekt (DB/Snapshots).

### 4) Warum evtl. viele OPEN oder niedrige Samples?
- Outcome-Evaluate läuft nur 1x täglich mit `limit=500` → kann Setups überlaufen lassen (older remain open/unprocessed).
- daysBack=90, aber Limit begrenzt → ältere Setups bleiben `open` wenn nicht erneut bewertet.
- Cohort-Filter in Admin Outcomes: `loadOutcomeStats` filtert `profile=SWING`, `timeframe=1D`, `exclude invalid`, Limit 300; zeigt nur Grade A/B und nur 10 recent rows → kann wenige Samples anzeigen, wenn Outcome-Bewertung nicht nachkommt.
- Intraday Setups (1H) nicht im Scope → nicht in Stats/Samples.

### 5) How to verify locally (ohne Ausführen hier, nur Befehlsvorschlag)
- Prüfen aktuelles Outcome-Fenster (Swing 1D):
  - `curl -X POST "$OUTCOME_CRON_BASE_URL/api/cron/outcomes/evaluate?daysBack=90&limit=500" -H "Authorization: Bearer $CRON_SECRET"`
  - Danach Abfrage: z. B. `SELECT outcome_status, COUNT(*) FROM setup_outcomes WHERE profile='SWING' AND timeframe='1D' AND evaluated_at >= now() - interval '30 days' GROUP BY outcome_status;`
- Prüfen Snapshots gebaut:
  - `curl -X POST "$CRON_ENDPOINT_URL" -H "Authorization: Bearer $CRON_SECRET"`
- Prüfen, ob Phase0 Weekly läuft:
  - GH Actions run `Phase0 Monitor` → Artefakte `phase0_report` etc.

### 6) Priorisierte Beobachtungen
- Outcome-Evaluate 1x/Tag mit Limit 500 ist wahrscheinlich die Hauptursache für viele OPEN/niedrige Samples bei Swing.
- BackfillSwing und recompute-decisions sind manuell und nicht in der CI hinterlegt → Prod kann hinterherhinken, wenn nicht manuell angestoßen.

### 7) Empfehlung (ohne Umsetzung)
- Erwäge Outcome-Evaluate häufiger oder Limit erhöhen (z. B. 4x/Tag oder Limit 2000) für Swing, falls DB/Quota ok.
- Operator-Runbook: Bei auffällig vielen OPEN → manueller Aufruf Outcome-Evaluate mit größerem Limit; ggf. BackfillSwing + recompute-decisions.
