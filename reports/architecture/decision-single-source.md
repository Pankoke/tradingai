# Decision Single Source of Truth (Snapshot Build)

## Goal
Ensure trading decisions are **computed exactly once** at snapshot build time and then **read-only** everywhere else.
No recomputation in UI, reports, or monitoring.

## Decision Contract (per setup)
Every **new** snapshot setup MUST include:
- `decision`: `TRADE | WATCH_PLUS | WATCH | BLOCKED`
- `decisionSegment`: `string` (single prioritized segment)
- `decisionReasons`: `string[]` (max 3–5 standardized texts)
- `decisionVersion`: `string` (e.g. `2026-01-18`)

Legacy snapshots:
- Must not be rewritten.
- Should be treated as `decisionVersion = "legacy"` in UI/reporting.

## Flow (ASCII)
```
Market Data
   |
   v
Perception Snapshot Build
   |  (resolve playbook + derive decision once)
   v
Persist snapshot.setups[]:
  - decision
  - decisionSegment
  - decisionReasons
  - decisionVersion
   |
   v
All Consumers (read-only):
  UI / Reports / Phase-0 / Admin / Phase-1
```

## Runtime Source (Decision)
Decision and WATCH_PLUS are computed during snapshot build:
- `src/features/perception/build/buildSetups.ts`
  - `deriveSetupDecision(...)`
  - `isWatchPlusGold(...)`
  - persisted into `snapshot.setups[]`

## Read-Only Consumers
These must **only read** persisted fields:
- UI ViewModels: `src/components/perception/setupViewModel/*`
- Premium Sorting: `src/components/setups/premiumHelpers.ts`
- Phase-0 Summary: `src/app/api/admin/playbooks/phase0-gold-swing/route.ts`
- Admin Recompute: `src/server/admin/recomputeDecisions.ts`

## Anti-Patterns (Not Allowed)
- Recomputing decision in UI or reports.
- Deriving WATCH_PLUS outside snapshot build.
- Inferring decision from grade after persistence.

## Guardrails (by convention)
Use comments or helper names to prevent drift:
- `Decision computed once here – do not recompute elsewhere` in build.
- Consumers should read `decision`, not `setupDecision`.

## Examples
### Gold (SWING)
- Decision computed in snapshot build.
- `WATCH_PLUS` is a real decision state.

### BTC (SWING)
- Decision computed in snapshot build.
- Reports must not derive decision from grade/score.

