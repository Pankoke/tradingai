# Setup UX Phase 4A Roadmap

## Scope
Phase 4A focuses on semantic framing so score cards are read as input metrics, without redesign.

## Story 14 - Contextualize Scores as Metrics (Score De-emphasis ohne Redesign)
- Status: Implemented
- Goal:
  - Clarify that score cards are input/context metrics and not standalone outcome judgments.
- Scope delivered:
  - Added visible scores-context microcopy at the start of the score layer in `SetupUnifiedCard`.
  - Added an additional short help line for "how to read" context, with i18n-only copy.
  - Added `data-testid="scores-context-microcopy"` for deterministic testability.
  - Extended component tests to assert microcopy presence in both `list` and `sotd` modes.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
  - `docs/setup-ux-phase4a-roadmap.md`
- PR/Commit: local 2026-02-11

## Story 15 - Strengthen Interpretation Framing (Interpretation-first, ohne Layer Shift)
- Status: Implemented
- Goal:
  - Make Decision Summary clearly readable as the primary interpretation layer without changing layer order.
- Scope delivered:
  - Added visible interpretation-framing line in `DecisionSummaryCard` (`data-testid="interpretation-framing"`).
  - Added short semantic help line clarifying that summary text interprets metrics and drivers as descriptive context.
  - Kept component/layout structure unchanged (no new panels, no layer shift, no redesign).
  - Extended component/integration tests to verify framing visibility in standalone card and embedded setup card rendering.
- Changed files:
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-phase4a-roadmap.md`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: local 2026-02-11

## Story 16 - Integrate Uncertainty into Interpretation (ohne neue Kennzahlen)
- Status: Implemented
- Goal:
  - Make uncertainty visible as a natural part of interpretation context, not only as an optional header badge.
- Scope delivered:
  - Integrated a calm uncertainty context line in the interpretation area of `DecisionSummaryCard`.
  - Line is rendered only when `summary.uncertainty` is present and uses the existing localized uncertainty level key (`low`/`medium`/`high`).
  - Added deterministic test hook `data-testid="uncertainty-integration"` and component test coverage for present/absent behavior.
  - Kept VM heuristic/data unchanged (no new scores, no new data sources, no redesign).
- Changed files:
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-phase4a-roadmap.md`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: local 2026-02-11

## Story 17 - Final Execution Contextualisation (cognitive neutralization, copy-only)
- Status: Implemented
- Goal:
  - Reinforce execution as structural reference context, not action plan, via calm microcopy only.
- Scope delivered:
  - Added one additional execution framing microcopy line in the existing execution header area.
  - Framing is visible in both `list` mode and `sotd` mode without changing execution structure or disclosure behavior.
  - Kept existing execution disclaimer intact (no additional disclaimer block).
  - Extended execution disclosure tests for framing visibility in list and sotd rendering.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardExecutionDisclosure.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-phase4a-roadmap.md`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
- PR/Commit: local 2026-02-11
