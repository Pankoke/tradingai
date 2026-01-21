# Phase-0 Freeze Baseline

Goal: capture a stable monitoring baseline before making policy changes. No logic changes are applied; we only observe.

## What to run

```bash
# Audit playbook coverage (last 30d by default)
npm run audit:playbooks

# Capture baseline JSON from Phase-0 endpoint (uses BASE_URL / CRON_SECRET if set)
npm run phase0:baseline

# (optional) build weekly report locally
npm run phase0:report
```

## What to check
- Phase-0 endpoint returns summaries for all active assets (gold, btc, spx, dax, ndx, dow, eurusd, gbpusd, usdjpy, eurjpy, fx peers).
- Weekly report renders all asset sections.
- FX: no “No default alignment”; reasons are non-empty; FX alignment distribution is present when data exists.
- No unexpected BLOCKED spikes without hard reasons.

## Inputs / Auth
- Requires `CRON_SECRET` (or `ADMIN_API_TOKEN`) in environment; `BASE_URL` defaults to `http://localhost:3000` if unset.

## Outputs
- Baseline JSON is written to `artifacts/phase0-baseline/<timestamp>.json`.
- Audit table is printed to console for quick coverage review.
