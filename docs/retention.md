# Retention Roadmap

## Phase 1 – Dry-Run Measurement

1. **Purpose**: Count rows that would be purged according to the future retention rules, but never delete them yet.  
2. **Endpoint**: `POST /api/cron/cleanup` (cron-only, secured via `CRON_SECRET`).  
3. **Observation**: Each run returns `countsByTable` + retention thresholds, and writes an `audit_run` entry (`action: cleanup.dry_run`).
4. **Secrets needed**:
   - `CRON_SECRET`: shared secret from other Cron endpoints.  
   - `CLEANUP_CRON_URL`: full URL to `/api/cron/cleanup` (used by the cleanup workflow).
5. **Visibility**: Ops/Audit UI surfaces the recent cleanup audit runs; the `meta` payload includes the counts and retention windows.

## Retention Rules (Phase 1 counting)

| Table | Rule (counted) | Retention |
| --- | --- | --- |
| `candles` | `timestamp < now - 180 days` | 180 days (candles older than this flagged for future deletion) |
| `perception_snapshot_items` | `created_at < now - 30 days` | 30 days (items older than this subject to cleanup) |
| `bias_snapshots` | `created_at < now - 90 days` | 90 days (older snapshots downsampled later) |
| `events` (high impact) | `scheduled_at < now - 365 days AND impact >=3` | 365 days for impactful events |
| `events` (low impact) | `scheduled_at < now - 90 days AND impact <3` | 90 days for everything else |
| `audit_runs` | `created_at < now - 180 days` | 180 days |

## Next Steps (Phase 2+)

When the dry-run job is stable, switch the cleanup cron to actual deletes (with dry-run toggle), add safety (max deletes, dry-run flag), and optionally reorganize data storage (eg. archive tables, S3 blobs).
