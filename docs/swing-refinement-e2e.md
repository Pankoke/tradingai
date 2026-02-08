# Swing 4H Refinement E2E Verification

This runbook verifies that Swing 4H levels refinement is active without changing decision/grade/scoring.

## Preconditions

- `DATABASE_URL` points to the target DB.
- Candle history exists for Swing assets (`1D`/`1W`) and refinement input (`4H` or `1H`).

## Steps

1. Audit candle availability (read-only):

```bash
npm run audit:candles
```

Inspect `reports/audits/candle-availability.md` for `1H`/`4H` availability and freshness.

2. If `1H` is missing/stale for Swing refinement assets, ingest only `1H` (no `15m`):

```bash
npm run ingest:swing-refinement:1h
```

Optional scoping via env vars:

```bash
SWING_REFINEMENT_1H_ASSETS=wti,silver,gbpusd,usdjpy SWING_REFINEMENT_1H_DAYS=60 npm run ingest:swing-refinement:1h
```

3. Build a fresh Swing snapshot using existing pipeline entrypoints:

```bash
npm run build
```

Then trigger one existing snapshot writer (pick one already used in your environment):

```bash
# Example: cron route via local app
POST /api/cron/perception
```

or

```bash
# Example: backfill existing snapshot pipeline
POST /api/cron/snapshots/backfillSwing
```

4. Run read-only audit:

```bash
npm run audit:swing-snapshots
```

5. Inspect:

- `reports/audits/swing-snapshots-metrics.md`
- `reports/audits/swing-4h-refinement-verification.md`

## Expected Signals

- `has4H` becomes `yes` for assets with `4H` or derivable `1H` data.
- `refinementAttempted` is greater than 0.
- `refinementApplied` is greater than 0 for at least some Swing assets when quality/bounds pass.
- Decision buckets stay stable; only level telemetry changes.
