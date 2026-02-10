# Setup UX Phase 3 Roadmap

## Scope
Phase 3 focuses on semantic clarity and information weighting in the canonical Setup UX without redesign.

## Story 10 - Decision Weight Rebalancing (Semantik & Informationsgewichtung)
- Status: Implemented
- Goal:
  - Clarify hierarchy: Scores are input metrics, Decision Summary is the overall interpretation layer.
- Scope delivered:
  - Added semantic section label for score layer in `SetupUnifiedCard`:
    - `setup.sections.inputMetrics`
    - `setup.sections.inputMetrics.help`
  - Added semantic section label for interpretation layer in `DecisionSummaryCard`:
    - `setup.sections.overallInterpretation`
    - `setup.sections.overallInterpretation.help`
  - Improved section semantics with heading/linking attributes (`aria-labelledby`, `aria-describedby`) while keeping layout stable.
  - Added tests for both labels and retained existing guard/test coverage.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-phase3-roadmap.md`

## Story 11 - Uncertainty Visibility (Decision Summary only)
- Status: Implemented
- Goal:
  - Make uncertainty explicit as a neutral context state in Decision Summary, without new scores or new data sources.
- Scope delivered:
  - Extended `DecisionSummaryVM` with optional uncertainty field (`level` + i18n `key`).
  - Added deterministic uncertainty heuristic in `buildDecisionSummaryVM` using only existing VM outputs:
    - reasonsAgainst present -> high
    - else cautions >= 2 -> medium
    - else cautions == 1 -> low
    - floor override to at least medium when `executionMode === "wait"` or `band === "C"`
  - Rendered uncertainty marker badge in `DecisionSummaryCard` header using i18n-only copy.
  - Added/updated tests for VM uncertainty scenarios and component rendering.
- Changed files:
  - `src/features/perception/viewModel/decisionSummary.ts`
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/viewModel/decisionSummary.test.ts`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-phase3-roadmap.md`

## Story 12 - Execution Neutralization (Copy + Semantik)
- Status: Implemented
- Goal:
  - Keep execution levels interpretable as setup structure context, not as instructions.
- Scope delivered:
  - Added neutral execution section semantics in `SetupUnifiedCard`:
    - section title
    - levels help line
    - RRR help line
    - short execution disclaimer (always visible in execution layer)
  - Neutralized execution-related copy in `en/de` for:
    - entry/stop/target level notes
    - risk/reward relationship labels and helper copy
    - execution context titles and bullet lines used in canonical execution rendering
  - Kept disclosure behavior and layout structure unchanged.
  - Extended execution disclosure component test to verify disclaimer visibility.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `tests/components/SetupUnifiedCardExecutionDisclosure.test.ts`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-phase3-roadmap.md`

## Story 13 - Explainability Linking (ruhige, institutionelle Variante)
- Status: Implemented
- Goal:
  - Make Decision Summary visibly grounded in existing driver context.
- Scope delivered:
  - Extended `DecisionSummaryVM` with optional `explainability` bullets (key + params).
  - Added deterministic explainability derivation from existing `pros`/`cautions` only (max 3).
  - Rendered calm text line under interpretation in `DecisionSummaryCard`:
    - `Based on: ...` / `Basierend auf: ...`
  - Added i18n keys for based-on label and separator.
  - Extended VM/component tests and kept legal guard green.
- Changed files:
  - `src/features/perception/viewModel/decisionSummary.ts`
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/viewModel/decisionSummary.test.ts`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-phase3-roadmap.md`
