# Cron-Schedules (UTC)

## Kategorien
- Marketdata Daily (`/api/cron/marketdata/sync`): 1D fetch, 1W derive, Provider-Calls.
- Marketdata Intraday (`/api/cron/marketdata/intraday`): 1H fetch, 4H derive, Provider-Calls.
- Perception Swing (`/api/cron/perception`): DB-only, 1D/1W.
- Perception Intraday (`/api/cron/perception/intraday`): DB-only, 1H/4H.
- Bias Sync (`/api/cron/bias/sync`): Bias-Berechnung.
- Outcomes Evaluate (`/api/cron/outcomes/evaluate`): Outcomes Scoring (Swing).
- Events (`/api/cron/events/ingest`, `/api/cron/events/enrich`): News/Events Pull + Enrichment.
- Cleanup (`/api/cron/cleanup`): Aufräumen (derzeit dry-run).
- Backfills (manuell): `/api/cron/outcomes/backfill`, `/api/cron/snapshots/backfillSwing` (keine festen Schedules).

## Schedule-Tabelle (UTC)
| Job/Workflow | Cron | Route | Depends on | Buffer |
| --- | --- | --- | --- | --- |
| marketdata-intraday-cron.yml | `0 * * * *` | `/api/cron/marketdata/intraday` | — | — |
| perception-intraday-cron.yml | `5 * * * *` | `/api/cron/perception/intraday` | marketdata-intraday | 5m |
| marketdata-cron.yml | `15 23,5,11,17 * * *` | `/api/cron/marketdata/sync` | — | — |
| bias-sync-cron.yml | `45 23,5,11,17 * * *` | `/api/cron/bias/sync` | marketdata (same window) | 30m |
| perception-cron.yml | `0 0,6,12,18 * * *` | `/api/cron/perception` | marketdata (previous :15) | ~45m |
| outcomes-evaluate.yml | `10 6 * * *` | `/api/cron/outcomes/evaluate` | perception (06:00) | 10m |
| events-enrich.yml | `0 2 * * *` | `/api/cron/events/ingest` → `/api/cron/events/enrich` | — | sequential |
| cleanup-cron.yml | `30 1 * * *` | `/api/cron/cleanup` | — | — |
| backfillSwing/outcomes-backfill | (manual) | `/api/cron/snapshots/backfillSwing`, `/api/cron/outcomes/backfill` | — | — |

## Abhängigkeiten (Bullets)
- Intraday: marketdata-intraday (:00) → perception-intraday (:05).
- Daily: marketdata (:15) → bias (:45) → perception (:00, +45m).
- Outcomes: perception 06:00 → outcomes-evaluate 06:10.
- Events: ingest → enrich (gleicher Job, sequential).
- Cleanup: unabhängig, aktuell 01:30 UTC.

## Runbook (manuell triggern)
Alle Endpoints erfordern `Authorization: Bearer $CRON_SECRET`.
```bash
# Marketdata
curl -X POST "$BASE/api/cron/marketdata/sync" -H "Authorization: Bearer $CRON_SECRET"
curl -X POST "$BASE/api/cron/marketdata/intraday" -H "Authorization: Bearer $CRON_SECRET"
# Perception
curl -X POST "$BASE/api/cron/perception" -H "Authorization: Bearer $CRON_SECRET"
curl -X POST "$BASE/api/cron/perception/intraday" -H "Authorization: Bearer $CRON_SECRET"
# Bias / Outcomes / Events / Cleanup
curl -X POST "$BASE/api/cron/bias/sync" -H "Authorization: Bearer $CRON_SECRET"
curl -X POST "$BASE/api/cron/outcomes/evaluate" -H "Authorization: Bearer $CRON_SECRET"
curl -X POST "$BASE/api/cron/events/ingest" -H "Authorization: Bearer $CRON_SECRET"
curl -X POST "$BASE/api/cron/events/enrich" -H "Authorization: Bearer $CRON_SECRET"
curl -X POST "$BASE/api/cron/cleanup" -H "Authorization: Bearer $CRON_SECRET"
```

### SQL Checks (Beispiele)
- Letzte 1H/4H (Intraday):
```sql
SELECT asset_id, timeframe, MAX(timestamp) AS last_ts
FROM candles
WHERE timeframe IN ('1H','4H')
GROUP BY asset_id, timeframe;
```
- Letzte 1D/1W (Daily):
```sql
SELECT asset_id, timeframe, MAX(timestamp) AS last_ts
FROM candles
WHERE timeframe IN ('1D','1W')
GROUP BY asset_id, timeframe;
```
- Derived 4H Counts (24h):
```sql
SELECT asset_id, COUNT(*) AS cnt
FROM candles
WHERE timeframe='4H' AND created_at >= NOW() - INTERVAL '1 day'
GROUP BY asset_id;
```
- Audit Meta (Fallback/Throttle/External):
```sql
SELECT action, created_at, meta
FROM audit_runs
WHERE action IN ('marketdata_intraday','marketdata_daily','snapshot_build')
ORDER BY created_at DESC LIMIT 20;
```

## Troubleshooting
- Rate-Limits/429: prüfe Throttler-Counter (meta: throttledCount, backoffCount, rateLimit429Count) und wiederholen nach Cooldown.
- Stale Intraday: perception-intraday überspringt Setups bei fehlenden/stalen 1H/4H Candles (Log/Audit prüfen).
- Scheduler: Nur GitHub Actions im Repo hinterlegt; bei Ausfällen ggf. manuell per curl triggern.

## Freshness Gates
- Swing Perception: 1D ≤ 72h, 1W ≤ 14d. Assets mit stale/missing werden für den Run übersprungen; Audit `meta.freshness`.
- Intraday Perception: 1H ≤ 180m (Skip Asset), 4H ≤ 480m (Warn). Audit `meta.freshness`.
- Outcomes Evaluate: benötigt Swing-Snapshot ≤ 12h alt und 1D/1W Candles nicht stale; andernfalls NO-OP mit Audit `abortedDueToFreshness`.
- Perception/Outcomes rufen keine Provider-APIs; sie prüfen ausschließlich DB-Freshness.
- Admin Observability: Freshness-Gates sichtbar unter Admin → System (Latest Gates), Admin → Marketdata (Latest Gate Results) und Admin → Audit (Gate/Status/Skipped + Filter `freshness=1`).
