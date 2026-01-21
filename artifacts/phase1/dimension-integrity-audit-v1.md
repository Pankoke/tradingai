# Dimension Integrity Audit (v1) — Phase-1 Prep (Analysis Only)

## A) Runtime source (where dimensions are produced)
- **Playbook resolve + evaluation:** `src/features/perception/build/buildSetups.ts`, function `buildAndStorePerceptionSnapshot`, lines ~70–210.
  - Resolves playbook via `resolvePlaybookWithReason(...)` (playbook id + reason) before evaluation.
  - Evaluates via `playbook.evaluateSetup(...)` → produces `setupGrade`, `setupType`, `gradeRationale`, `noTradeReason`, `debugReason`.
  - Runtime fields attached to setups before persistence:
    - `setupGrade`, `setupType`, `gradeRationale`, `noTradeReason`, `gradeDebugReason`
    - `setupPlaybookId` (the resolved playbook id)
    - Rings/Confidence/Sentiment metadata.

## B) Persistence sink (what is stored today)
- **Snapshots table JSON:** `perception_snapshots.setups` (see `buildAndStorePerceptionSnapshot`, tail section ~235–280).
  - Stores each setup JSON with the runtime fields listed above, but **field names**:
    - `setupPlaybookId` (not `playbookId`)
    - `setupGrade`
    - `setupType`
    - `gradeRationale`, `noTradeReason`, `gradeDebugReason`
    - No explicit `decision`, `alignment`, `decisionReasons`, `watchSegment/fxWatchSegment` in this builder.
- **Snapshot items table:** `perception_snapshot_items` (schema in `src/server/db/schema/perceptionSnapshotItems.ts`)
  - Stores: `snapshotId`, `assetId`, `setupId`, direction, ranks, scores, confidence, biasScore, riskReward, ringAiSummary, timestamps.
  - Does **not** store playbookId/decision/grade/alignment/reasons/segments.

## C) Gap (why Phase-1.1 saw unknown/generic)
- Phase-1.1 analyzer looks for `playbookId`/`decision`/`grade` in persisted data:
  - `playbookId`: Not present; only `setupPlaybookId` exists in snapshots JSON → analyzer falls back to assetId mapping.
  - `decision`: Not persisted; only `setupType`/`noTradeReason` exist → analyzer reports `unknown`.
  - `alignment`, `reasons`, `segments`: Not persisted in the snapshot builder path → unavailable for Phase-1.1.
- Because items table lacks these dimensions and snapshots use different field names, the analyzer lacks source-of-truth and resorts to generic fallback.

## D) Empfehlung (minimal persistence path)
1) **Persist in snapshots.setups JSON (preferred, no schema change):**
   - Add fields when building setups:
     - `playbookId` (copy of `setupPlaybookId`)
     - `decision` (resolved decision category from evaluation/setupDecision; today missing)
     - `grade` (copy of `setupGrade`)
     - Optional: `alignment`, `decisionReasons`, `watchSegment`/`fxWatchSegment`.
   - Keep existing fields for backward compatibility.
2) **Optional**: also persist to `perception_snapshot_items` if needed for faster queries, but JSON alone is sufficient for Phase-1.1.
3) Schema migration **not required** if JSON extended; use same builder (`buildAndStorePerceptionSnapshot`) to write additional keys.

## E) Backfill / Recompute entrypoints (existing)
- Admin endpoint: `src/app/api/admin/maintenance/recompute-decisions/route.ts` (POST) — used previously for decision backfill.
- Snapshot builder path: `src/features/perception/build/buildSetups.ts` — can be invoked via cron/backfill (e.g., `/api/cron/perception`, `/api/cron/snapshots/backfillSwing`).
- Recommendation: after adding persisted fields, rerun recompute/backfill for Swing assets (1D/1W, labels eod/us_open/morning/(null), 30–60d) via existing maintenance or cron endpoints.
