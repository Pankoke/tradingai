# Admin Auth + Audit Inventory

Last updated: 2026-02-08

This inventory covers admin export endpoints and admin ops/action triggers.

## Export Endpoints

| Endpoint | File | Purpose | Auth Mode | Audit Logging | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/admin/outcomes/export` | `src/app/api/admin/outcomes/export/route.ts` | Outcomes CSV/JSON export | admin-or-cron (`requireAdminOrCron`) | Yes (`admin_outcomes_export`) | Stores `rows` and `bytes` where available |
| `/api/admin/playbooks/calibration/export` | `src/app/api/admin/playbooks/calibration/export/route.ts` | Calibration CSV/JSON export | admin-or-cron | Yes (`admin_calibration_export`) | Stores `rows` and `bytes` |
| `/api/admin/playbooks/thresholds/export` | `src/app/api/admin/playbooks/thresholds/export/route.ts` | Threshold recommendation CSV/JSON export | admin-or-cron | Yes (`admin_thresholds_export`) | CSV rows + bytes |
| `/api/admin/playbooks/thresholds/simulate/export` | `src/app/api/admin/playbooks/thresholds/simulate/export/route.ts` | Simulation result CSV/JSON export | admin-or-cron | Yes (`admin_thresholds_simulate_export`) | Includes simulation params |
| `/api/admin/backtest/runs/[runKey]/export` | `src/app/api/admin/backtest/runs/[runKey]/export/route.ts` | Single run CSV export | admin-or-cron | Yes (`admin_backtest_run_export`) | Origin check applies to admin mode only |
| `/api/admin/backtest/compare/export` | `src/app/api/admin/backtest/compare/export/route.ts` | Compare runs CSV export | admin-or-cron | Yes (`admin_backtest_compare_export`) | Origin check applies to admin mode only |

## Ops / Action Endpoints

| Endpoint | File | Purpose | Auth Mode | Audit Logging | Notes |
| --- | --- | --- | --- | --- | --- |
| `/api/admin/ops/perception` | `src/app/api/admin/ops/perception/route.ts` | Trigger perception snapshot job(s) | admin-or-cron | Yes | Uses normalized audit meta |
| `/api/admin/ops/marketdata` | `src/app/api/admin/ops/marketdata/route.ts` | Trigger marketdata sync | admin-or-cron | Yes | Logs unknown symbol / success / failure |
| `/api/admin/ops/bias` | `src/app/api/admin/ops/bias/route.ts` | Trigger bias sync | admin-or-cron | Yes | Logs success/failure |
| `/api/admin/backtest/run` | `src/app/api/admin/backtest/run/route.ts` | Trigger backtest run | admin-or-cron | Yes (`admin_backtest_run`) | Existing run logic unchanged |
| `/api/admin/marketdata/derived-backfill` | `src/app/api/admin/marketdata/derived-backfill/route.ts` | Trigger derived timeframe backfill | admin-or-cron | Yes (`admin_derived_backfill`) | Logs target timeframe + chunk count |
| `/api/admin/sentiment/backfill` | `src/app/api/admin/sentiment/backfill/route.ts` | Trigger sentiment backfill | admin-or-cron | Yes (`admin_sentiment_backfill`) | Logs params and processed rows |
| `/api/admin/maintenance/recompute-decisions` | `src/app/api/admin/maintenance/recompute-decisions/route.ts` | Recompute setup decisions | admin-or-cron | Yes (`admin_recompute_decisions`) | Keeps `x-recompute-route` header |
| `/api/admin/playbooks/thresholds/simulate` | `src/app/api/admin/playbooks/thresholds/simulate/route.ts` | Trigger threshold simulation (non-export) | admin-or-cron | Yes (`admin_thresholds_simulate`) | Simulation logic unchanged |

## Auth / Audit Standards

- Unified guard: `src/lib/admin/auth/requireAdminOrCron.ts`
- Admin is preferred when both admin and cron credentials are valid.
- Unauthorized response shape:
  - `{ ok: false, error: { code: "UNAUTHORIZED", message, details: { hasAdmin, hasCron, usedAdmin, usedCron } } }`
- Unified audit meta builder:
  - `src/lib/admin/audit/buildAuditMeta.ts`
  - Required fields: `authMode`, `actor`, `request.path`, `request.method`, `params`, `result.ok`

