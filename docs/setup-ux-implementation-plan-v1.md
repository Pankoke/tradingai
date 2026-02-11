# Setup UX - Implementation Plan v1

Roadmap status: COMPLETE (Stories 1-8 implemented, canonical behavior documented).

## Story 1 - Enhanced Setup Header (Data Mode & Timestamps)
- Status: Implemented
- Scope delivered:
  - Data mode badge in setup detail header (`Live` / `Mock (demo data)`).
  - Time context labels in header (`Generated` and `As of`).
  - Neutral tooltip clarifying Generated vs As of.
  - Optional context badges for `Backtest` / `Playback` only when reliably inferable.
  - Unit test for mode label key mapping (`live` vs `mock`).
- Changed files:
  - `src/app/[locale]/setups/[id]/page.tsx`
  - `src/lib/config/perceptionDataMode.ts`
  - `src/lib/mockSetups.ts`
  - `tests/viewModel/setupHeaderModeLabel.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`

## Story 2 - Decision Summary Data Model & Heuristics (pure TS)
- Status: Implemented
- Scope delivered:
  - Pure function `buildDecisionSummaryVM(input)` implemented with deterministic heuristics.
  - New typed VM contracts for interpretation/band/execution mode/pros/cautions/reasonsAgainst.
  - Heuristic mapping from existing setup signals (grade, decision, rings, signalQuality, rrr, event modifier).
  - Unit test suite with five scenarios (strong setup, confirmation required, NO_TRADE reasons, event critical, weak RRR).
  - i18n keys under `setup.decisionSummary.*` added for de/en.
- Changed files:
  - `src/features/perception/viewModel/decisionSummary.ts`
  - `tests/viewModel/decisionSummary.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`

## Story 3 - Decision Summary UI Component (Card + i18n + disclaimer)
- Status: Implemented
- Scope delivered:
  - Reusable `DecisionSummaryCard` component created for `DecisionSummaryVM`.
  - Renders title, band badge, execution mode badge, interpretation line, pros/cautions, optional reasonsAgainst.
  - Legal microcopy added with always-visible short disclaimer and tooltip long disclaimer.
  - All UI labels are i18n-driven under `setup.decisionSummary.*`.
  - Component test added for title/disclaimer, interpretation, bullet rendering, conditional reasonsAgainst block.
- Changed files:
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`

## Story 4 - Integrate Decision Summary in Setup Page (Layer Order)
- Status: Implemented
- Scope delivered:
  - Also integrated into `SetupUnifiedCard` for premium/sotd visibility (expanded state).
  - Layer order aligned as: Header -> Scores -> Decision Summary -> Drivers -> Execution.
  - Safe fallback added in Unified Card path: if summary build fails unexpectedly, no crash.
  - Dev debug fallback added (dev-only) in Unified Card path: debug box shown at decision-summary layer with reason code.
  - Integration test added to verify `expanded=true`/`expanded=false` rendering behavior in Unified Card.
  - Legacy cleanup (4.3): deprecated route `src/app/[locale]/setups/[id]/page.tsx` removed; canonical path is premium/UnifiedCard.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
  - `src/app/[locale]/setups/[id]/page.tsx` (removed)
  - `tests/components/setupDetailDecisionSummaryIntegration.test.ts` (removed)
  - `src/lib/mockSetups.ts`

## Story 5 - Copy Quality Audit Fixes
- Status: Implemented
- Scope delivered:
  - Generic/placeholder score-driver copy replaced with deterministic, concrete bullets.
  - New pure helper `driverCopy.ts` maps existing scores/flags/reasons to i18n key+params bullets.
  - Dedupe and max-3 cap enforced in helper output.
  - `SetupUnifiedCard` score cards now render helper bullets instead of generic fallback strings.
  - Added i18n keys under `setup.scoreDrivers.*` for de/en.
  - Added unit tests for dedupe, concrete reasons, and max-3 cap.
- Changed files:
  - `src/features/perception/viewModel/driverCopy.ts`
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/viewModel/driverCopy.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`

## Story 6 - Mobile Setup Page (Progressive Disclosure)
- Status: Implemented
- Scope delivered:
  - Progressive disclosure for driver details added in `SetupUnifiedCard` for `mode="list"` (premium/sotd list context).
  - Drivers detail content now defaults to collapsed in list mode to reduce initial scroll and cognitive load.
  - Driver detail toggle is keyboard-accessible and wired with `aria-expanded` + `aria-controls`.
  - Ring score/header layer remains visible while detailed insight content is hidden until explicit user expansion.
  - Desktop/SOTD behavior preserved: no disclosure trigger, details remain visible.
  - Added component tests for collapsed-by-default, click-to-expand, and SOTD non-collapsible behavior.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardMobileDisclosure.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `package.json`
  - `package-lock.json`

## Story 7 - Legal disclaimer integration
- Status: Implemented
- Scope delivered:
  - Legal-safe disclaimer consistency validated in Setup UX path: `DecisionSummaryCard` retains always-visible short disclaimer plus long tooltip copy.
  - Automated i18n legal copy guard added as policy-as-code for `de`/`en`.
  - Guard scans `setup.*` message keys and fails on forbidden advisory/imperative terms (case-insensitive, word-boundary based).
  - False-positive mitigation included for technical wording (`trade-off` is not treated as forbidden `trade` match).
- Changed files:
  - `tests/i18n/legalCopyGuard.test.ts`

## Story 8 - Execution Layer Progressive Disclosure (Premium Scan UX)
- Status: Implemented
- Scope delivered:
  - Execution progressive disclosure added to `SetupUnifiedCard` for `mode="list"` to reduce initial premium scan scroll length.
  - Compact execution summary row (Entry, Stop, Take-Profit, RRR) is always visible in list mode.
  - Full execution details are now initially collapsed in list mode and expandable via keyboard-accessible trigger.
  - Trigger wiring includes `aria-expanded` and `aria-controls`.
  - SOTD/Desktop behavior preserved: execution details visible by default and no disclosure trigger.
  - Added component tests for list-mode collapsed default, click-to-expand, and SOTD visible default.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardExecutionDisclosure.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`

## Story 9 - Setup UX Spec Consolidation + QA Checklist (Docs only)
- Status: Implemented
- Scope delivered:
  - Consolidated canonical Setup UX behavior in a dedicated spec doc.
  - Added a reusable QA checklist for list-mode disclosure, expanded-card behavior, a11y, language, NO_TRADE/BLOCKED, and legal guard verification.
  - Marked roadmap completion in status/plan docs.
- Changed files:
  - `docs/setup-ux-spec-v1.md`
  - `docs/setup-ux-qa-checklist-v1.md`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`

## Story 10 - Decision Weight Rebalancing (Semantik & Informationsgewichtung)
- Status: Implemented
- Scope delivered:
  - Score layer in `SetupUnifiedCard` now has explicit semantic section labeling as input metrics.
  - Decision Summary layer now has explicit semantic sub-labeling as overall interpretation.
  - Added neutral helper lines for both sections to reinforce informational hierarchy.
  - Added landmark/heading semantics (`aria-labelledby`, `aria-describedby`) without visual redesign.
  - Added component test coverage for input-metrics and overall-interpretation labels.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-phase3-roadmap.md`
  - `docs/setup-ux-implementation-plan-v1.md`

## Story 14 - Contextualize Scores as Metrics (Score De-emphasis ohne Redesign)
- Status: Implemented
- Scope delivered:
  - Added a neutral, visible scores-context microcopy at the start of the score layer in `SetupUnifiedCard`.
  - Added a short supporting help line to reinforce that score cards are input/context metrics.
  - Kept layout, layer order, and component structure unchanged (microcopy/semantics only).
  - Added test coverage for microcopy presence in both `list` and `sotd` modes.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-phase4a-roadmap.md`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`

## Story 15 - Strengthen Interpretation Framing (Interpretation-first, ohne Layer Shift)
- Status: Implemented
- Scope delivered:
  - Added a visible interpretation-framing line to `DecisionSummaryCard` to emphasize interpretation-first reading.
  - Added a short semantic help line clarifying that summary text interprets metrics and drivers as descriptive context.
  - No layer shift, no new component, no structural redesign.
  - Added test coverage in both standalone `DecisionSummaryCard` and embedded `SetupUnifiedCard` rendering.
- Changed files:
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `tests/components/SetupUnifiedCardDecisionSummary.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-phase4a-roadmap.md`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`

## Story 16 - Integrate Uncertainty into Interpretation (ohne neue Kennzahlen)
- Status: Implemented
- Scope delivered:
  - Added a calm uncertainty integration line in the interpretation area of `DecisionSummaryCard`.
  - Integration uses existing localized uncertainty level output (`setup.decisionSummary.uncertainty.*`) and appears only when uncertainty exists.
  - Added `data-testid="uncertainty-integration"` and component tests for present/absent rendering behavior.
  - No DecisionSummary VM heuristic changes and no layout/layer changes.
- Changed files:
  - `src/components/perception/DecisionSummaryCard.tsx`
  - `tests/components/DecisionSummaryCard.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-phase4a-roadmap.md`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`

## Story 17 - Final Execution Contextualisation (cognitive neutralization, copy-only)
- Status: Implemented
- Scope delivered:
  - Added one calm execution framing microcopy line in the existing execution header area.
  - Framing is visible in list and sotd modes without changing disclosure or section structure.
  - Existing execution disclaimer remained in place; no additional disclaimer block introduced.
  - Extended execution disclosure tests to verify framing visibility for list and sotd rendering.
- Changed files:
  - `src/components/perception/setupViewModel/SetupUnifiedCard.tsx`
  - `tests/components/SetupUnifiedCardExecutionDisclosure.test.ts`
  - `src/messages/en.json`
  - `src/messages/de.json`
  - `docs/setup-ux-phase4a-roadmap.md`
  - `docs/setup-ux-status.md`
  - `docs/setup-ux-implementation-plan-v1.md`
